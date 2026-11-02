"""AI-Powered Inventory Management — ML Forecasting Service."""

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
import os
import logging

from src.train import train_pipeline, load_model
from src.forecasting import generate_forecast, fallback_forecast
from src.preprocessing import load_sales_data, clean_data, get_product_timeseries

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# Global state for model
model_state: Dict[str, Any] = {
    "model": None,
    "model_version": None,
    "model_loaded": False,
    "feature_names": [],
    "product_id_map": {},
    "metrics": {},
    "metadata": {},
}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load saved model on startup if it exists."""
    model_dir = os.environ.get("MODEL_PATH", "models")
    logger.info(f"Checking for saved model in: {model_dir}")

    model, metadata = load_model(model_dir)
    if model is not None and metadata is not None:
        model_state["model"] = model
        model_state["model_version"] = metadata.get("model_version", "unknown")
        model_state["model_loaded"] = True
        model_state["feature_names"] = metadata.get("feature_names", [])
        model_state["product_id_map"] = metadata.get("product_id_map", {})
        model_state["metrics"] = metadata.get("metrics", {})
        model_state["metadata"] = metadata
        logger.info(f"Model loaded on startup: {model_state['model_version']}")
    else:
        logger.info("No saved model found. Use POST /train to train a model.")

    yield  # App runs here

    logger.info("Shutting down ML service.")


app = FastAPI(
    title="Inventory AI — ML Service",
    description="Demand Forecasting & Inventory Intelligence",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ──── Pydantic Models ────────────────────────────────────────────


class HealthResponse(BaseModel):
    status: str
    service: str
    model_loaded: bool
    model_version: Optional[str] = None


class ModelStatusResponse(BaseModel):
    model_loaded: bool
    model_version: Optional[str] = None
    feature_columns: List[str] = []
    metrics: Dict[str, Any] = {}
    num_products: Optional[int] = None
    product_ids: List[str] = []


class ForecastRequest(BaseModel):
    product_id: str
    forecast_days: int = Field(default=7, ge=1, le=90)
    historical_sales: List[Dict[str, Any]] = []


class ForecastResponse(BaseModel):
    product_id: str
    forecast_days: int
    predictions: List[float]
    total_predicted_demand: float
    model_version: str
    is_fallback: bool = False
    fallback_reason: Optional[str] = None


class TrainRequest(BaseModel):
    data_path: Optional[str] = None
    sales_data: List[Dict[str, Any]] = []


class TrainResponse(BaseModel):
    success: bool
    model_version: str
    metrics: Dict[str, float]
    message: str


# ──── Endpoints ──────────────────────────────────────────────────


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        service="inventory-ai-ml-service",
        model_loaded=model_state["model_loaded"],
        model_version=model_state["model_version"],
    )


@app.get("/model/status", response_model=ModelStatusResponse)
async def get_model_status():
    """Get current model status and metadata."""
    metadata = model_state.get("metadata", {})
    return ModelStatusResponse(
        model_loaded=model_state["model_loaded"],
        model_version=model_state["model_version"],
        feature_columns=model_state["feature_names"],
        metrics=model_state["metrics"],
        num_products=metadata.get("num_products"),
        product_ids=metadata.get("product_ids", []),
    )


@app.post("/forecast", response_model=ForecastResponse)
async def forecast(request: ForecastRequest):
    """Generate demand forecast for a product.

    If a trained model is available, uses XGBoost iterative multi-step
    forecasting. Otherwise, falls back to a moving-average baseline.
    """
    import pandas as pd

    # Build historical DataFrame from request or sample data
    if request.historical_sales:
        hist_df = pd.DataFrame(request.historical_sales)
        if "date" in hist_df.columns:
            hist_df["date"] = pd.to_datetime(hist_df["date"])
        if "quantity" not in hist_df.columns:
            raise HTTPException(
                status_code=400,
                detail="historical_sales must contain 'quantity' column",
            )
        if "price" not in hist_df.columns:
            hist_df["price"] = 0.0
    else:
        # Try loading from sample data
        data_path = os.environ.get("DATA_PATH", "data/sample_sales.csv")
        try:
            raw_df = load_sales_data(data_path)
            raw_df = clean_data(raw_df)
            hist_df = get_product_timeseries(raw_df, request.product_id)
        except Exception as e:
            logger.error(f"Failed to load data for {request.product_id}: {e}")
            raise HTTPException(
                status_code=404,
                detail=f"No data found for product {request.product_id}. "
                f"Provide historical_sales in the request body.",
            )

    if hist_df.empty:
        raise HTTPException(
            status_code=404,
            detail=f"No historical data for product: {request.product_id}",
        )

    # Use ML model if available, otherwise fallback
    if model_state["model_loaded"] and model_state["model"] is not None:
        product_id_map = model_state.get("product_id_map", {})
        product_encoded = product_id_map.get(request.product_id, 0)

        result = generate_forecast(
            model=model_state["model"],
            product_id=request.product_id,
            historical_df=hist_df,
            forecast_days=request.forecast_days,
            feature_names=model_state["feature_names"],
            product_encoded=product_encoded,
        )
        result["model_version"] = model_state["model_version"] or "unknown"
    else:
        result = fallback_forecast(hist_df, request.product_id, request.forecast_days)
        result["model_version"] = "fallback-moving-avg"

    return ForecastResponse(**result)


@app.post("/predict", response_model=ForecastResponse)
async def predict(request: ForecastRequest):
    """Alias for forecast endpoint."""
    return await forecast(request)


@app.post("/train", response_model=TrainResponse)
async def train(request: TrainRequest):
    """Train or retrain the forecasting model.

    Uses sample data by default. Pass data_path or sales_data to override.
    """
    import pandas as pd

    data_path = request.data_path or os.environ.get(
        "DATA_PATH", "data/sample_sales.csv"
    )
    model_dir = os.environ.get("MODEL_PATH", "models")

    # If sales_data provided in request body, save to temp file
    if request.sales_data:
        import tempfile

        temp_df = pd.DataFrame(request.sales_data)
        temp_path = os.path.join(model_dir, "_temp_training_data.csv")
        os.makedirs(model_dir, exist_ok=True)
        temp_df.to_csv(temp_path, index=False)
        data_path = temp_path

    try:
        result = train_pipeline(data_path=data_path, model_dir=model_dir)
    except Exception as e:
        logger.error(f"Training failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Training failed: {str(e)}",
        )

    # Update global model state
    model, metadata = load_model(model_dir)
    if model is not None and metadata is not None:
        model_state["model"] = model
        model_state["model_version"] = metadata.get("model_version", "unknown")
        model_state["model_loaded"] = True
        model_state["feature_names"] = metadata.get("feature_names", [])
        model_state["product_id_map"] = metadata.get("product_id_map", {})
        model_state["metrics"] = metadata.get("metrics", {})
        model_state["metadata"] = metadata

    return TrainResponse(
        success=True,
        model_version=result["model_version"],
        metrics=result["metrics"],
        message=(
            f"Model trained successfully. "
            f"MAE: {result['metrics']['mae']:.3f}, "
            f"RMSE: {result['metrics']['rmse']:.3f}, "
            f"MAPE: {result['metrics']['mape']:.1f}%"
        ),
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
