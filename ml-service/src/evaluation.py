"""Model evaluation module — computes forecasting regression metrics.

Uses proper metric names (MAE, RMSE, MAPE) — never called 'accuracy'.
"""

import numpy as np
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)


def calculate_mae(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Mean Absolute Error.

    MAE = (1/n) * Σ|y_true - y_pred|
    """
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    return float(np.mean(np.abs(y_true - y_pred)))


def calculate_rmse(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Root Mean Squared Error.

    RMSE = sqrt((1/n) * Σ(y_true - y_pred)²)
    """
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    return float(np.sqrt(np.mean((y_true - y_pred) ** 2)))


def calculate_mape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Mean Absolute Percentage Error (zero-safe).

    MAPE = (100/n) * Σ|y_true - y_pred| / max(|y_true|, 1)

    Uses max(|y_true|, 1) to avoid division by zero when actual demand is 0.
    """
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)

    # Avoid division by zero: use max(|y_true|, 1)
    denominator = np.maximum(np.abs(y_true), 1.0)
    return float(100.0 * np.mean(np.abs(y_true - y_pred) / denominator))


def evaluate_model(
    y_true: np.ndarray, y_pred: np.ndarray
) -> Dict[str, float]:
    """Compute all evaluation metrics for a model.

    Args:
        y_true: Actual demand values.
        y_pred: Predicted demand values.

    Returns:
        Dictionary with MAE, RMSE, and MAPE values.
    """
    metrics = {
        "mae": calculate_mae(y_true, y_pred),
        "rmse": calculate_rmse(y_true, y_pred),
        "mape": calculate_mape(y_true, y_pred),
    }

    logger.info(
        f"Model evaluation — MAE: {metrics['mae']:.3f}, "
        f"RMSE: {metrics['rmse']:.3f}, MAPE: {metrics['mape']:.1f}%"
    )
    return metrics


def generate_evaluation_report(
    metrics: Dict[str, float], metadata: Dict[str, Any]
) -> str:
    """Generate a human-readable evaluation report.

    Args:
        metrics: Dict with mae, rmse, mape keys.
        metadata: Model metadata (version, training date, etc.).

    Returns:
        Formatted report string.
    """
    report_lines = [
        "=" * 50,
        "  DEMAND FORECASTING MODEL — EVALUATION REPORT",
        "=" * 50,
        "",
        f"  Model Version:    {metadata.get('model_version', 'unknown')}",
        f"  Training Date:    {metadata.get('training_date', 'unknown')}",
        f"  Dataset:          {metadata.get('dataset_info', 'unknown')}",
        f"  Num Products:     {metadata.get('num_products', 'unknown')}",
        f"  Train Samples:    {metadata.get('train_samples', 'unknown')}",
        f"  Test Samples:     {metadata.get('test_samples', 'unknown')}",
        "",
        "  REGRESSION METRICS (on held-out test set)",
        "  " + "-" * 40,
        f"  MAE  (Mean Absolute Error):       {metrics.get('mae', 0):.3f}",
        f"  RMSE (Root Mean Squared Error):    {metrics.get('rmse', 0):.3f}",
        f"  MAPE (Mean Abs Percentage Error):  {metrics.get('mape', 0):.1f}%",
        "",
        "  INTERPRETATION",
        "  " + "-" * 40,
        f"  On average, predictions are off by ~{metrics.get('mae', 0):.1f} units.",
        f"  Larger errors are penalized more by RMSE ({metrics.get('rmse', 0):.1f}).",
        f"  Relative error is approximately {metrics.get('mape', 0):.1f}%.",
        "",
        "=" * 50,
    ]
    return "\n".join(report_lines)
