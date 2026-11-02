"""Tests for the feature engineering module."""

import pytest
import pandas as pd
import numpy as np

from src.features import (
    create_time_features,
    create_lag_features,
    create_rolling_features,
    create_price_features,
    build_feature_matrix,
)


@pytest.fixture
def daily_series():
    """Create a 90-day daily time series for one product."""
    dates = pd.date_range("2025-01-01", periods=90, freq="D")
    np.random.seed(42)
    return pd.DataFrame({
        "date": dates,
        "product_id": "TEST001",
        "quantity": np.random.randint(5, 25, size=90),
        "price": 29.99,
    })


class TestTimeFeatures:
    def test_creates_all_columns(self, daily_series):
        result = create_time_features(daily_series)
        expected = {"day_of_week", "day_of_month", "month", "year",
                    "quarter", "is_weekend", "week_of_year"}
        assert expected.issubset(set(result.columns))

    def test_weekend_detection(self, daily_series):
        result = create_time_features(daily_series)
        # Jan 4, 2025 is a Saturday
        sat_row = result[result["date"] == pd.Timestamp("2025-01-04")]
        assert sat_row["is_weekend"].values[0] == 1
        # Jan 6, 2025 is a Monday
        mon_row = result[result["date"] == pd.Timestamp("2025-01-06")]
        assert mon_row["is_weekend"].values[0] == 0


class TestLagFeatures:
    def test_lag_1_uses_previous_value(self, daily_series):
        result = create_lag_features(daily_series)
        # lag_1 of row i should be quantity of row i-1
        assert result["lag_1"].iloc[1] == daily_series["quantity"].iloc[0]

    def test_lag_1_first_row_is_nan(self, daily_series):
        result = create_lag_features(daily_series)
        assert pd.isna(result["lag_1"].iloc[0])

    def test_no_data_leakage(self, daily_series):
        """Verify lag features never use current or future data."""
        result = create_lag_features(daily_series)
        for i in range(1, len(result)):
            # lag_1 at position i must equal quantity at position i-1
            assert result["lag_1"].iloc[i] == daily_series["quantity"].iloc[i - 1]


class TestRollingFeatures:
    def test_creates_rolling_columns(self, daily_series):
        result = create_rolling_features(daily_series)
        assert "rolling_7_mean" in result.columns
        assert "rolling_7_std" in result.columns
        assert "rolling_30_mean" in result.columns
        assert "rolling_30_std" in result.columns

    def test_rolling_uses_shifted_data(self, daily_series):
        """Rolling features should be computed on shift(1) data — no leakage."""
        result = create_rolling_features(daily_series)
        # rolling_7_mean at row 8 should use rows 1-7 (shifted by 1)
        # i.e., quantity values at indices 0-6
        expected_mean = daily_series["quantity"].iloc[1:8].mean()
        actual_mean = result["rolling_7_mean"].iloc[8]
        assert abs(actual_mean - expected_mean) < 0.01


class TestPriceFeatures:
    def test_price_rolling_mean(self, daily_series):
        result = create_price_features(daily_series)
        assert "price_rolling_mean" in result.columns


class TestBuildFeatureMatrix:
    def test_returns_correct_shapes(self, daily_series):
        X, y, feature_names = build_feature_matrix(daily_series)
        assert len(X) == len(y)
        assert len(X) > 0
        assert len(feature_names) > 0
        assert X.shape[1] == len(feature_names)

    def test_no_nan_in_output(self, daily_series):
        X, y, _ = build_feature_matrix(daily_series, drop_na=True)
        assert X.isna().sum().sum() == 0

    def test_target_not_in_features(self, daily_series):
        _, _, feature_names = build_feature_matrix(daily_series)
        assert "quantity" not in feature_names
        assert "date" not in feature_names

    def test_has_expected_feature_types(self, daily_series):
        _, _, feature_names = build_feature_matrix(daily_series)
        assert "lag_1" in feature_names
        assert "rolling_7_mean" in feature_names
        assert "day_of_week" in feature_names
