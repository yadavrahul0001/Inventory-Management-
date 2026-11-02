"""Forecasting module — iterative multi-step demand forecasting.

Supports both ML-based forecasting (XGBoost) and fallback moving-average
forecasting when the model is unavailable or data is insufficient.
"""

import pandas as pd
import numpy as np
import logging
from typing import Dict, List, Optional, Any

from .features import (
    create_time_features,
    create_lag_features,
    create_rolling_features,
    create_price_features,
)

logger = logging.getLogger(__name__)


def generate_forecast(
    model: Any,
    product_id: str,
    historical_df: pd.DataFrame,
    forecast_days: int,
    feature_names: List[str],
    product_encoded: int = 0,
) -> Dict[str, Any]:
    """Generate multi-step demand forecast using iterative prediction.

    For each future day:
    1. Build features from historical data (including prior predictions)
    2. Predict demand for that day
    3. Append prediction to history
    4. Repeat for next day

    Args:
        model: Trained XGBRegressor model.
        product_id: Product identifier.
        historical_df: DataFrame with 'date', 'quantity', 'price' columns.
        forecast_days: Number of days to forecast (1-90).
        feature_names: List of feature column names expected by the model.
        product_encoded: Encoded product integer for multi-product models.

    Returns:
        Dict with product_id, forecast_days, predictions, total_predicted_demand,
        model_version, and is_fallback flag.
    """
    if historical_df.empty or len(historical_df) < 7:
        logger.warning(
            f"Insufficient history for {product_id} ({len(historical_df)} rows). "
            f"Using fallback forecast."
        )
        return fallback_forecast(historical_df, product_id, forecast_days)

    # Build working history
    history = historical_df.copy()
    history = history.sort_values("date").reset_index(drop=True)

    last_date = history["date"].max()
    last_price = float(history["price"].iloc[-1]) if "price" in history.columns else 0.0

    predictions: List[float] = []

    for day_offset in range(1, forecast_days + 1):
        forecast_date = last_date + pd.Timedelta(days=day_offset)

        # Build a temporary row for the forecast date
        new_row = pd.DataFrame(
            {
                "date": [forecast_date],
                "quantity": [0.0],  # placeholder — will be predicted
                "price": [last_price],
            }
        )
        temp_df = pd.concat([history, new_row], ignore_index=True)

        # Create features on the full history + new row
        temp_df = create_time_features(temp_df)
        temp_df = create_lag_features(temp_df, "quantity")
        temp_df = create_rolling_features(temp_df, "quantity")
        temp_df = create_price_features(temp_df)
        temp_df["product_encoded"] = product_encoded

        # Extract features for the last row (the forecast date)
        last_row = temp_df.iloc[-1:]

        # Ensure all expected feature columns exist
        for col in feature_names:
            if col not in last_row.columns:
                last_row = last_row.copy()
                last_row[col] = 0.0

        features = last_row[feature_names].fillna(0.0).values

        # Predict
        raw_pred = float(model.predict(features)[0])
        pred = max(round(raw_pred, 1), 0.0)
        predictions.append(pred)

        # Update history with the predicted value for next iteration
        history = pd.concat(
            [
                history,
                pd.DataFrame(
                    {
                        "date": [forecast_date],
                        "quantity": [pred],
                        "price": [last_price],
                    }
                ),
            ],
            ignore_index=True,
        )

    total_demand = round(sum(predictions), 1)

    logger.info(
        f"Forecast for {product_id}: {forecast_days} days, "
        f"total predicted demand = {total_demand}"
    )

    return {
        "product_id": product_id,
        "forecast_days": forecast_days,
        "predictions": predictions,
        "total_predicted_demand": total_demand,
        "is_fallback": False,
    }


def fallback_forecast(
    historical_df: pd.DataFrame,
    product_id: str,
    forecast_days: int,
) -> Dict[str, Any]:
    """Moving-average fallback forecast when ML model is unavailable.

    Uses the trailing 14-day (or available) mean as the daily prediction.
    Clearly labeled as is_fallback=True so the UI can distinguish it.

    Args:
        historical_df: Historical sales DataFrame.
        product_id: Product identifier.
        forecast_days: Number of days to forecast.

    Returns:
        Forecast dict with is_fallback=True.
    """
    if historical_df.empty or "quantity" not in historical_df.columns:
        # No data at all — return zeros
        predictions = [0.0] * forecast_days
        return {
            "product_id": product_id,
            "forecast_days": forecast_days,
            "predictions": predictions,
            "total_predicted_demand": 0.0,
            "is_fallback": True,
            "fallback_reason": "No historical data available",
        }

    # Use trailing 14-day average (or whatever is available)
    recent = historical_df.tail(14)
    daily_avg = round(float(recent["quantity"].mean()), 1)

    # Add slight variance so predictions aren't all identical
    np.random.seed(42)
    noise = np.random.normal(0, max(daily_avg * 0.1, 0.5), forecast_days)
    predictions = [round(max(daily_avg + n, 0.0), 1) for n in noise]

    total_demand = round(sum(predictions), 1)

    logger.info(
        f"Fallback forecast for {product_id}: {forecast_days} days, "
        f"daily avg = {daily_avg}, total = {total_demand}"
    )

    return {
        "product_id": product_id,
        "forecast_days": forecast_days,
        "predictions": predictions,
        "total_predicted_demand": total_demand,
        "is_fallback": True,
        "fallback_reason": "Insufficient data for ML model — using 14-day moving average",
    }
