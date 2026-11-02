"""Tests for ML service main endpoints."""

import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "inventory-ai-ml-service"
    assert isinstance(data["model_loaded"], bool)

def test_model_status():
    response = client.get("/model/status")
    assert response.status_code == 200
    data = response.json()
    assert "model_loaded" in data
    assert "feature_columns" in data
    assert "metrics" in data

def test_forecast_without_data():
    response = client.post("/forecast", json={
        "product_id": "TEST_MISSING",
        "forecast_days": 7
    })
    # Should return 404 since no data is provided in request and product doesn't exist in sample
    assert response.status_code == 404

def test_forecast_fallback():
    # Provide data to trigger the fallback forecast when model isn't loaded
    response = client.post("/forecast", json={
        "product_id": "TEST001",
        "forecast_days": 7,
        "historical_sales": [
            {"date": f"2025-01-{str(i).zfill(2)}", "quantity": 10, "price": 10.0} 
            for i in range(1, 15)
        ]
    })
    assert response.status_code == 200
    data = response.json()
    assert data["is_fallback"] is True
    assert len(data["predictions"]) == 7
