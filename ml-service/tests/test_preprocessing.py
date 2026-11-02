"""Tests for the preprocessing module."""

import pytest
import pandas as pd
import numpy as np
import os
import tempfile

from src.preprocessing import (
    load_sales_data,
    clean_data,
    validate_data,
    get_product_timeseries,
    split_data,
)


@pytest.fixture
def sample_df():
    """Create a small sample DataFrame for testing."""
    dates = pd.date_range("2025-01-01", periods=60, freq="D")
    rows = []
    for d in dates:
        for pid in ["PROD_A", "PROD_B"]:
            rows.append({
                "date": d,
                "product_id": pid,
                "quantity": np.random.randint(1, 20),
                "price": 10.0 if pid == "PROD_A" else 25.0,
            })
    return pd.DataFrame(rows)


@pytest.fixture
def sample_csv(sample_df, tmp_path):
    """Write sample data to a CSV and return the path."""
    path = str(tmp_path / "test_sales.csv")
    sample_df.to_csv(path, index=False)
    return path


class TestLoadSalesData:
    def test_load_valid_csv(self, sample_csv):
        df = load_sales_data(sample_csv)
        assert len(df) == 120  # 60 days × 2 products
        assert set(df.columns) >= {"date", "product_id", "quantity", "price"}
        assert pd.api.types.is_datetime64_any_dtype(df["date"])

    def test_load_missing_file(self):
        with pytest.raises(FileNotFoundError):
            load_sales_data("/nonexistent/path.csv")

    def test_load_missing_columns(self, tmp_path):
        bad_csv = str(tmp_path / "bad.csv")
        pd.DataFrame({"x": [1], "y": [2]}).to_csv(bad_csv, index=False)
        with pytest.raises(ValueError, match="Missing required columns"):
            load_sales_data(bad_csv)


class TestCleanData:
    def test_removes_nulls(self, sample_df):
        dirty = sample_df.copy()
        dirty.loc[0, "quantity"] = None
        cleaned = clean_data(dirty)
        assert cleaned["quantity"].isna().sum() == 0

    def test_clamps_negatives(self, sample_df):
        dirty = sample_df.copy()
        dirty.loc[0, "quantity"] = -5
        dirty.loc[1, "price"] = -10
        cleaned = clean_data(dirty)
        assert cleaned["quantity"].min() >= 0
        assert cleaned["price"].min() >= 0

    def test_removes_duplicates(self, sample_df):
        doubled = pd.concat([sample_df, sample_df], ignore_index=True)
        cleaned = clean_data(doubled)
        assert len(cleaned) == len(sample_df)


class TestValidateData:
    def test_valid_data(self, sample_df):
        report = validate_data(sample_df)
        assert report["valid"] is True
        assert report["num_products"] == 2
        assert report["num_rows"] == 120

    def test_insufficient_rows(self):
        small = pd.DataFrame({
            "date": pd.date_range("2025-01-01", periods=5),
            "product_id": ["A"] * 5,
            "quantity": [1] * 5,
            "price": [10] * 5,
        })
        report = validate_data(small, min_rows=30)
        assert report["valid"] is False
        assert any("Insufficient rows" in i for i in report["issues"])


class TestGetProductTimeseries:
    def test_extracts_single_product(self, sample_df):
        ts = get_product_timeseries(sample_df, "PROD_A")
        assert len(ts) == 60  # continuous daily
        assert "quantity" in ts.columns
        assert "price" in ts.columns

    def test_fills_missing_days(self):
        df = pd.DataFrame({
            "date": pd.to_datetime(["2025-01-01", "2025-01-03", "2025-01-05"]),
            "product_id": ["X", "X", "X"],
            "quantity": [10, 20, 30],
            "price": [5.0, 5.0, 5.0],
        })
        ts = get_product_timeseries(df, "X", fill_missing=True)
        assert len(ts) == 5  # Jan 1-5 continuous
        assert ts.loc[ts["date"] == pd.Timestamp("2025-01-02"), "quantity"].values[0] == 0

    def test_unknown_product_returns_empty(self, sample_df):
        ts = get_product_timeseries(sample_df, "NONEXISTENT")
        assert ts.empty


class TestSplitData:
    def test_chronological_split(self, sample_df):
        train, test = split_data(sample_df, test_ratio=0.2)
        assert len(train) + len(test) == len(sample_df)
        assert len(test) == pytest.approx(len(sample_df) * 0.2, abs=1)

    def test_no_overlap(self, sample_df):
        train, test = split_data(sample_df, test_ratio=0.3)
        # Train dates should all be <= test dates
        if "date" in train.columns and "date" in test.columns:
            assert train["date"].max() <= test["date"].min()
