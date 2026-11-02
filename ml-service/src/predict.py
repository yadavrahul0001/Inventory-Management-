"""Prediction module — run XGBoost inference with output clamping."""

import numpy as np
import logging
from typing import List

logger = logging.getLogger(__name__)


def predict_demand(model, features: np.ndarray) -> np.ndarray:
    """Run XGBoost demand prediction with non-negative clamping.

    Args:
        model: Trained XGBRegressor model.
        features: Feature matrix (2D numpy array or DataFrame).

    Returns:
        Predicted demand values, clamped to >= 0.
    """
    raw_predictions = model.predict(features)
    # Clamp predictions to non-negative (demand cannot be negative)
    predictions = np.maximum(raw_predictions, 0.0)

    if np.any(raw_predictions < 0):
        neg_count = np.sum(raw_predictions < 0)
        logger.info(
            f"Clamped {neg_count} negative prediction(s) to 0 "
            f"(min raw value: {raw_predictions.min():.2f})"
        )

    return predictions


def predict_single(model, features: np.ndarray) -> float:
    """Predict demand for a single sample.

    Args:
        model: Trained XGBRegressor model.
        features: 1D feature array for a single sample.

    Returns:
        Single predicted demand value (>= 0).
    """
    features_2d = np.asarray(features).reshape(1, -1)
    prediction = predict_demand(model, features_2d)
    return float(prediction[0])
