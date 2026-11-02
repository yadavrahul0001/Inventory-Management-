"""Tests for model training, evaluation, prediction, and forecasting."""

import pytest
import pandas as pd
import numpy as np
import os
import json

from src.evaluation import calculate_mae, calculate_rmse, calculate_mape, evaluate_model
from src.predict import predict_demand, predict_single
from src.forecasting import fallback_forecast


@pytest.fixture
def sample_data():
    """Create 120-day sample data for two products."""
    dates = pd.date_range("2025-01-01", periods=120, freq="D")
    rows = []
    np.random.seed(42)
    for d in dates:
        for pid, base in [("PROD_A", 12), ("PROD_B", 8)]:
            qty = max(0, int(base + np.random.normal(0, 3)))
            rows.append({
                "date": d,
                "product_id": pid,
                "quantity": qty,
                "price": 25.0 if pid == "PROD_A" else 15.0,
            })
    return pd.DataFrame(rows)


class TestEvaluationMetrics:
    def test_mae_perfect(self):
        y = np.array([10, 20, 30])
        assert calculate_mae(y, y) == 0.0

    def test_mae_known_value(self):
        y_true = np.array([10, 20, 30])
        y_pred = np.array([12, 18, 33])
        # |2| + |2| + |3| = 7, / 3 = 2.333...
        assert abs(calculate_mae(y_true, y_pred) - 7 / 3) < 1e-6

    def test_rmse_perfect(self):
        y = np.array([5, 10, 15])
        assert calculate_rmse(y, y) == 0.0

    def test_rmse_known_value(self):
        y_true = np.array([10, 20, 30])
        y_pred = np.array([12, 18, 33])
        # (4 + 4 + 9) / 3 = 5.666..., sqrt = 2.38
        expected = np.sqrt(17 / 3)
        assert abs(calculate_rmse(y_true, y_pred) - expected) < 1e-6

    def test_mape_zero_safe(self):
        """MAPE should not crash when y_true contains zeros."""
        y_true = np.array([0, 10, 20])
        y_pred = np.array([2, 12, 18])
        result = calculate_mape(y_true, y_pred)
        assert result >= 0
        assert np.isfinite(result)

    def test_evaluate_model_returns_all_metrics(self):
        y_true = np.array([10, 20, 30, 40])
        y_pred = np.array([11, 19, 32, 38])
        metrics = evaluate_model(y_true, y_pred)
        assert "mae" in metrics
        assert "rmse" in metrics
        assert "mape" in metrics
        assert all(v >= 0 for v in metrics.values())


class TestPrediction:
    def test_predict_demand_clamps_negatives(self):
        """Mock a model that returns negative values — they should be clamped."""

        class MockModel:
            def predict(self, X):
                return np.array([-5.0, 3.0, -1.0, 10.0])

        model = MockModel()
        preds = predict_demand(model, np.zeros((4, 5)))
        assert np.all(preds >= 0)
        assert preds[0] == 0.0
        assert preds[1] == 3.0

    def test_predict_single(self):
        class MockModel:
            def predict(self, X):
                return np.array([7.5])

        result = predict_single(MockModel(), np.zeros(5))
        assert result == 7.5


class TestFallbackForecast:
    def test_fallback_returns_correct_structure(self):
        hist = pd.DataFrame({
            "date": pd.date_range("2025-01-01", periods=30),
            "quantity": np.random.randint(5, 15, 30),
            "price": 10.0,
        })
        result = fallback_forecast(hist, "TEST001", 7)
        assert result["product_id"] == "TEST001"
        assert result["forecast_days"] == 7
        assert len(result["predictions"]) == 7
        assert result["is_fallback"] is True
        assert result["total_predicted_demand"] >= 0

    def test_fallback_empty_data(self):
        result = fallback_forecast(pd.DataFrame(), "TEST001", 7)
        assert result["is_fallback"] is True
        assert all(p == 0.0 for p in result["predictions"])

    def test_fallback_predictions_non_negative(self):
        hist = pd.DataFrame({
            "date": pd.date_range("2025-01-01", periods=30),
            "quantity": [1] * 30,
            "price": 5.0,
        })
        result = fallback_forecast(hist, "X", 30)
        assert all(p >= 0 for p in result["predictions"])


class TestTrainPipeline:
    """Integration test using the actual sample_sales.csv if available."""

    @pytest.fixture
    def sample_csv(self, tmp_path, sample_data):
        path = str(tmp_path / "sales.csv")
        sample_data.to_csv(path, index=False)
        return path

    def test_full_pipeline(self, sample_csv, tmp_path):
        """End-to-end: train → save → load → predict."""
        from src.train import train_pipeline, load_model

        model_dir = str(tmp_path / "models")
        result = train_pipeline(
            data_path=sample_csv,
            model_dir=model_dir,
            test_ratio=0.2,
        )

        assert result["success"] is True
        assert "mae" in result["metrics"]
        assert "rmse" in result["metrics"]
        assert "mape" in result["metrics"]
        assert result["metrics"]["mae"] >= 0
        assert result["metrics"]["rmse"] >= 0

        # Verify files were saved
        assert os.path.exists(os.path.join(model_dir, "demand_model.joblib"))
        assert os.path.exists(os.path.join(model_dir, "model_metadata.json"))

        # Verify metadata
        with open(os.path.join(model_dir, "model_metadata.json")) as f:
            metadata = json.load(f)
        assert "model_version" in metadata
        assert "feature_names" in metadata
        assert "metrics" in metadata

        # Load and verify
        model, meta = load_model(model_dir)
        assert model is not None
        assert meta is not None
        assert meta["model_version"] == result["model_version"]

    def test_model_not_found(self, tmp_path):
        from src.train import load_model

        model, meta = load_model(str(tmp_path / "nonexistent"))
        assert model is None
        assert meta is None

    def test_forecast_with_trained_model(self, sample_csv, tmp_path, sample_data):
        """Train a model and generate a forecast."""
        from src.train import train_pipeline, load_model
        from src.forecasting import generate_forecast
        from src.preprocessing import clean_data, get_product_timeseries

        model_dir = str(tmp_path / "models")
        result = train_pipeline(data_path=sample_csv, model_dir=model_dir)
        model, metadata = load_model(model_dir)

        hist_df = get_product_timeseries(clean_data(sample_data), "PROD_A")
        forecast = generate_forecast(
            model=model,
            product_id="PROD_A",
            historical_df=hist_df,
            forecast_days=7,
            feature_names=metadata["feature_names"],
            product_encoded=0,
        )

        assert forecast["product_id"] == "PROD_A"
        assert forecast["forecast_days"] == 7
        assert len(forecast["predictions"]) == 7
        assert forecast["is_fallback"] is False
        assert all(p >= 0 for p in forecast["predictions"])
        assert forecast["total_predicted_demand"] >= 0
