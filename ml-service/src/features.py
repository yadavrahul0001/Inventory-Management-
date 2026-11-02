"""Feature engineering module for demand forecasting.

All lag and rolling features use shift(1) minimum to prevent data leakage —
features for day N are computed using only data from day N-1 and earlier.
"""

import pandas as pd
import numpy as np
import logging
from typing import Tuple, List

logger = logging.getLogger(__name__)


def create_time_features(df: pd.DataFrame) -> pd.DataFrame:
    """Create calendar/time-based features from the date column.

    Features created:
        - day_of_week (0=Monday, 6=Sunday)
        - day_of_month (1-31)
        - month (1-12)
        - year
        - quarter (1-4)
        - is_weekend (0 or 1)
        - week_of_year (1-53)
    """
    df = df.copy()
    df["day_of_week"] = df["date"].dt.dayofweek
    df["day_of_month"] = df["date"].dt.day
    df["month"] = df["date"].dt.month
    df["year"] = df["date"].dt.year
    df["quarter"] = df["date"].dt.quarter
    df["is_weekend"] = (df["date"].dt.dayofweek >= 5).astype(int)
    df["week_of_year"] = df["date"].dt.isocalendar().week.astype(int)
    return df


def create_lag_features(df: pd.DataFrame, target_col: str = "quantity") -> pd.DataFrame:
    """Create lagged demand features.

    Uses shift() to prevent data leakage — lag_1 uses yesterday's value, etc.

    Features created:
        - lag_1, lag_7, lag_14, lag_30
    """
    df = df.copy()
    for lag in [1, 7, 14, 30]:
        df[f"lag_{lag}"] = df[target_col].shift(lag)
    return df


def create_rolling_features(
    df: pd.DataFrame, target_col: str = "quantity"
) -> pd.DataFrame:
    """Create rolling window statistical features.

    Windows are shifted by 1 to prevent data leakage — rolling_7_mean uses
    the 7 days ending yesterday, not including today.

    Features created:
        - rolling_7_mean, rolling_7_std
        - rolling_30_mean, rolling_30_std
    """
    df = df.copy()

    for window in [7, 30]:
        # shift(1) ensures we only use past data
        shifted = df[target_col].shift(1)
        df[f"rolling_{window}_mean"] = shifted.rolling(window=window, min_periods=1).mean()
        df[f"rolling_{window}_std"] = shifted.rolling(window=window, min_periods=1).std().fillna(0)

    return df


def create_price_features(df: pd.DataFrame) -> pd.DataFrame:
    """Create price-related features.

    Features created:
        - price (kept as-is)
        - price_rolling_mean (7-day rolling mean of price)
    """
    df = df.copy()
    if "price" in df.columns:
        df["price_rolling_mean"] = (
            df["price"].shift(1).rolling(window=7, min_periods=1).mean()
        )
    return df


def encode_product_id(df: pd.DataFrame, product_id_col: str = "product_id") -> pd.DataFrame:
    """Encode product_id as a numerical feature for multi-product models.

    Uses label encoding — each unique product gets an integer code.
    """
    df = df.copy()
    if product_id_col in df.columns:
        df["product_encoded"] = df[product_id_col].astype("category").cat.codes
    return df


def build_feature_matrix(
    df: pd.DataFrame,
    target_col: str = "quantity",
    drop_na: bool = True,
) -> Tuple[pd.DataFrame, pd.Series, List[str]]:
    """Build the complete feature matrix for model training.

    Orchestrates all feature creation steps, drops NaN rows from lag/rolling
    window initialization, and returns X, y, and feature names.

    Args:
        df: DataFrame with at least 'date' and target_col columns.
        target_col: Name of the target column.
        drop_na: Whether to drop rows with NaN values from lag initialization.

    Returns:
        Tuple of (X features DataFrame, y target Series, feature_names list).
    """
    df = df.copy()

    # Create all features
    df = create_time_features(df)
    df = create_lag_features(df, target_col)
    df = create_rolling_features(df, target_col)
    df = create_price_features(df)
    df = encode_product_id(df)

    # Define feature columns (exclude date, product_id, and target)
    exclude_cols = {"date", "product_id", target_col}
    feature_names = [col for col in df.columns if col not in exclude_cols]

    if drop_na:
        initial_len = len(df)
        df = df.dropna(subset=feature_names)
        dropped = initial_len - len(df)
        if dropped > 0:
            logger.info(
                f"Dropped {dropped} rows with NaN from lag/rolling initialization "
                f"({initial_len} -> {len(df)})"
            )

    X = df[feature_names].copy()
    y = df[target_col].copy()

    logger.info(f"Feature matrix: {X.shape[0]} samples, {X.shape[1]} features")
    logger.info(f"Features: {feature_names}")

    return X, y, feature_names


def get_feature_names() -> List[str]:
    """Return the list of feature names used by the model.

    Useful for reconstructing features during inference.
    """
    return [
        "day_of_week",
        "day_of_month",
        "month",
        "year",
        "quarter",
        "is_weekend",
        "week_of_year",
        "lag_1",
        "lag_7",
        "lag_14",
        "lag_30",
        "rolling_7_mean",
        "rolling_7_std",
        "rolling_30_mean",
        "rolling_30_std",
        "price",
        "price_rolling_mean",
        "product_encoded",
    ]
