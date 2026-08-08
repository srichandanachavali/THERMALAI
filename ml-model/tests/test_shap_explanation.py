"""Tests for SHAP-based risk explanation (top_drivers)."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest

from config import FEATURES
import risk_service


@pytest.fixture(scope="module")
def loaded():
    risk_service.load_models()
    assert risk_service.model is not None, "rf_model.pkl must exist to test SHAP"
    return risk_service


READING = {
    "temperature": 140.0,
    "pressure": 6.0,
    "cooling_efficiency": 0.5,
    "reaction_rate": 0.7,
    "temp_rate_of_change": 3.0,
}


def test_build_feature_vector_length_and_order(loaded):
    vec = loaded.build_feature_vector(READING)
    assert len(vec) == len(FEATURES)
    # index 0 = temperature
    assert vec[0] == READING["temperature"]
    # index 3 = cooling_efficiency
    assert vec[3] == READING["cooling_efficiency"]


def test_shap_top_drivers_returns_three(loaded):
    drivers, confidence = loaded.shap_top_drivers(READING)
    assert confidence in ("high", "medium")
    assert len(drivers) == 3
    for d in drivers:
        assert d["sensor"] in FEATURES
        assert d["direction"] in ("increasing", "decreasing")
        assert "current_value" in d
        assert "human_readable" in d
        assert "contribution" in d


def test_top_driver_sorted_by_abs_contribution(loaded):
    drivers, _ = loaded.shap_top_drivers(READING)
    abses = [abs(d["contribution"]) for d in drivers]
    assert abses == sorted(abses, reverse=True)


def test_risk_score_still_works_with_explainer_loaded(loaded):
    result = loaded.calculate_risk_score(READING)
    assert 0 <= result["risk_score"] <= 100
