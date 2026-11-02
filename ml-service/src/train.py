"""Model training module — XGBoost demand forecasting pipeline.

Trains a global XGBRegressor across all products. Product identity is
encoded as a numerical feature so the model learns product-specific patterns.
"""

import json
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import joblib
import numpy as np
import pandas as pd
from xgboost import XGBRegressor

from .evaluation import evaluate_model, generate_evaluation_report
from .features import build_feature_matrix, get_feature_names
from .preprocessing import (
    clean_data,
    get_product_timeseries,
    load_sales_data,
    split_data,
    validate_data,
)

logger = logging.getLogger(__name__)

# Default hyperparameters
DEFAULT_PARAMS = {
    "n_estimators": 200,
    "max_depth": 6,
    "learning_rate": 0.1,
    "subsample": 0.8,
    "colsample_bytree": 0.8,
    "min_child_weight": 3,
    "reg_alpha": 0.1,
    "reg_lambda": 1.0,
    "random_state": 42,
    "n_jobs": -1,
}


def train_model(
    X_train: np.ndarray,
    y_train: np.ndarray,
    params: Optional[Dict[str, Any]] = None,
) -> XGBRegressor:
    """Train an XGBRegressor model.

    Args:
        X_train: Training feature matrix.
        y_train: Training target values.
        params: Optional hyperparameter overrides.

    Returns:
        Trained XGBRegressor model.
    """
    model_params = {**DEFAULT_PARAMS}
    if params:
        model_params.update(params)

    model = XGBRegressor(**model_params)
    model.fit(X_train, y_train)

    logger.info(
        f"Model trained: {model_params['n_estimators']} estimators, "
        f"max_depth={model_params['max_depth']}, "
        f"lr={model_params['learning_rate']}"
    )
    return model


def save_model(
    model: XGBRegressor,
    metadata: Dict[str, Any],
    model_dir: str = "models",
) -> str:
    """Save trained model and metadata to disk.

    Args:
        model: Trained XGBRegressor.
        metadata: Model metadata dict.
        model_dir: Directory to save model files.

    Returns:
        Path to saved model file.
    """
    os.makedirs(model_dir, exist_ok=True)

    model_path = os.path.join(model_dir, "demand_model.joblib")
    metadata_path = os.path.join(model_dir, "model_metadata.json")

    joblib.dump(model, model_path)

    # Make metadata JSON-serializable
    serializable_metadata = {}
    for k, v in metadata.items():
        if isinstance(v, (np.floating, np.integer)):
            serializable_metadata[k] = float(v)
        elif isinstance(v, np.ndarray):
            serializable_metadata[k] = v.tolist()
        else:
            serializable_metadata[k] = v

    with open(metadata_path, "w") as f:
        json.dump(serializable_metadata, f, indent=2, default=str)

    logger.info(f"Model saved to {model_path}")
    logger.info(f"Metadata saved to {metadata_path}")
    return model_path


def load_model(
    model_dir: str = "models",
) -> Tuple[Optional[XGBRegressor], Optional[Dict[str, Any]]]:
    """Load a trained model and metadata from disk.

    Args:
        model_dir: Directory containing model files.

    Returns:
        Tuple of (model, metadata), or (None, None) if not found.
    """
    model_path = os.path.join(model_dir, "demand_model.joblib")
    metadata_path = os.path.join(model_dir, "model_metadata.json")

    if not os.path.exists(model_path):
        logger.warning(f"No saved model found at {model_path}")
        return None, None

    model = joblib.load(model_path)

    metadata = {}
    if os.path.exists(metadata_path):
        with open(metadata_path, "r") as f:
            metadata = json.load(f)

    logger.info(
        f"Model loaded: version={metadata.get('model_version', 'unknown')}"
    )
    return model, metadata


def train_pipeline(
    data_path: str = "data/sample_sales.csv",
    model_dir: str = "models",
    test_ratio: float = 0.2,
) -> Dict[str, Any]:
    """End-to-end training pipeline.

    Steps:
    1. Load and clean data
    2. Validate data quality
    3. Build per-product time series with zero-fill
    4. Create feature matrix (all products combined)
    5. Chronological train/test split
    6. Train XGBRegressor
    7. Evaluate on held-out test set
    8. Save model + metadata
    9. Return results

    Args:
        data_path: Path to sales CSV file.
        model_dir: Directory to save model.
        test_ratio: Fraction of data for testing.

    Returns:
        Dict with success status, model_version, metrics, and report.
    """
    logger.info("=" * 50)
    logger.info("STARTING TRAINING PIPELINE")
    logger.info("=" * 50)

    # Step 1: Load and clean
    logger.info("Step 1/8: Loading data...")
    raw_df = load_sales_data(data_path)
    df = clean_data(raw_df)

    # Step 2: Validate
    logger.info("Step 2/8: Validating data...")
    validation = validate_data(df)
    if not validation["valid"]:
        logger.warning(f"Data validation issues: {validation['issues']}")
        # Continue anyway — issues are warnings, not blockers

    # Step 3: Build per-product time series and combine
    logger.info("Step 3/8: Building product time series...")
    product_ids = df["product_id"].unique().tolist()
    product_id_map = {pid: idx for idx, pid in enumerate(product_ids)}

    all_product_dfs = []
    for pid in product_ids:
        ts = get_product_timeseries(df, pid)
        ts["product_id"] = pid
        all_product_dfs.append(ts)

    combined_df = pd.concat(all_product_dfs, ignore_index=True)
    combined_df["product_encoded"] = combined_df["product_id"].map(product_id_map)

    logger.info(
        f"Combined dataset: {len(combined_df)} rows, "
        f"{len(product_ids)} products"
    )

    # Step 4: Feature engineering
    logger.info("Step 4/8: Engineering features...")
    # We need to build features per-product to avoid cross-product lag contamination
    feature_dfs = []
    for pid in product_ids:
        p_df = combined_df[combined_df["product_id"] == pid].copy()
        p_df = p_df.sort_values("date").reset_index(drop=True)

        X_p, y_p, feature_names = build_feature_matrix(p_df, target_col="quantity")
        X_p["_target"] = y_p.values
        X_p["_date"] = p_df.loc[X_p.index, "date"].values if len(X_p) <= len(p_df) else None
        feature_dfs.append(X_p)

    full_features = pd.concat(feature_dfs, ignore_index=True)

    y_full = full_features["_target"]
    dates = full_features.get("_date")
    X_full = full_features.drop(columns=["_target", "_date"], errors="ignore")
    feature_names = list(X_full.columns)

    logger.info(f"Feature matrix: {X_full.shape[0]} samples × {X_full.shape[1]} features")

    # Step 5: Chronological split
    logger.info("Step 5/8: Splitting train/test...")
    split_idx = int(len(X_full) * (1 - test_ratio))
    X_train = X_full.iloc[:split_idx]
    X_test = X_full.iloc[split_idx:]
    y_train = y_full.iloc[:split_idx]
    y_test = y_full.iloc[split_idx:]

    logger.info(f"Train: {len(X_train)} samples, Test: {len(X_test)} samples")

    # Step 6: Train
    logger.info("Step 6/8: Training XGBoost model...")
    model = train_model(X_train.values, y_train.values)

    # Step 7: Evaluate
    logger.info("Step 7/8: Evaluating model...")
    y_pred = model.predict(X_test.values)
    y_pred = np.maximum(y_pred, 0.0)  # clamp negatives
    metrics = evaluate_model(y_test.values, y_pred)

    # Step 8: Save
    logger.info("Step 8/8: Saving model...")
    model_version = f"xgb-v1-{datetime.now().strftime('%Y%m%d-%H%M%S')}"

    metadata = {
        "model_version": model_version,
        "training_date": datetime.now().isoformat(),
        "data_path": data_path,
        "dataset_info": f"{len(raw_df)} raw rows, {len(product_ids)} products",
        "num_products": len(product_ids),
        "product_ids": product_ids,
        "product_id_map": product_id_map,
        "feature_names": feature_names,
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "test_ratio": test_ratio,
        "hyperparameters": DEFAULT_PARAMS,
        "metrics": metrics,
    }

    save_model(model, metadata, model_dir)

    # Generate report
    report = generate_evaluation_report(metrics, metadata)
    logger.info("\n" + report)

    return {
        "success": True,
        "model_version": model_version,
        "metrics": metrics,
        "metadata": metadata,
        "report": report,
    }


if __name__ == "__main__":
    """Run training pipeline from command line."""
    import sys

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    data_path = sys.argv[1] if len(sys.argv) > 1 else "data/sample_sales.csv"
    model_dir = sys.argv[2] if len(sys.argv) > 2 else "models"

    result = train_pipeline(data_path=data_path, model_dir=model_dir)

    if result["success"]:
        print("\n[SUCCESS] Training completed successfully!")
        print(f"  Model version: {result['model_version']}")
        print(f"  MAE:  {result['metrics']['mae']:.3f}")
        print(f"  RMSE: {result['metrics']['rmse']:.3f}")
        print(f"  MAPE: {result['metrics']['mape']:.1f}%")
    else:
        print("\n✗ Training failed!")
        sys.exit(1)
