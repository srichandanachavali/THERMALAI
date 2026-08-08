"""Tests for the independent physics simulator (risk cross-check layer)."""

import math
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest

from simulation.reactor_simulator import ReactorSimulator, GAS_CONSTANT

VALID_STATE = {
    "temperature": 110.0,
    "pressure": 4.0,
    "reaction_rate": 0.8,
    "cooling_efficiency": 85.0,
    "timestamp": "2026-08-09T00:00:00Z",
}


@pytest.fixture
def nitration():
    return ReactorSimulator("nitration")


@pytest.fixture
def hydrogenation():
    return ReactorSimulator("hydrogenation")


def test_loads_kinetics_params(nitration):
    assert nitration.activation_energy == 70000
    assert nitration.runaway_temperature_threshold == 150.0
    assert nitration.pre_exponential_factor == 1e8


def test_unknown_reactor_type_raises():
    with pytest.raises(ValueError):
        ReactorSimulator("bogus_type")


def test_arrhenius_rate_matches_formula(nitration):
    t = 25.0
    expected = nitration.pre_exponential_factor * math.exp(
        -nitration.activation_energy / (GAS_CONSTANT * (t + 273.15))
    )
    assert nitration.arrhenius_rate(t) == pytest.approx(expected)


def test_arrhenius_rate_increases_with_temperature(nitration):
    assert nitration.arrhenius_rate(120) > nitration.arrhenius_rate(25)


def test_simulate_step_cooling_dominates_below_threshold(nitration):
    result = nitration.simulate_step(VALID_STATE)
    assert result["simulation_valid"] is True
    assert result["predicted_temperature"] < VALID_STATE["temperature"]
    assert result["runaway_risk_score"] == 0.0


def test_simulate_step_high_temp_flags_runaway(hydrogenation):
    hot = dict(VALID_STATE, temperature=140.0)  # above hydrogenation threshold 120
    result = hydrogenation.simulate_step(hot)
    assert result["runaway_risk_score"] > 0
    assert result["runaway_risk_score"] <= 100
    assert result["predicted_temperature"] > 120.0


def test_simulate_step_missing_keys_returns_invalid():
    sim = ReactorSimulator("nitration")
    result = sim.simulate_step({"temperature": 90})
    assert result["simulation_valid"] is False
    assert result["predicted_temperature"] is None


def test_validate_high_confidence_when_matching(nitration):
    simulated = nitration.simulate_step(VALID_STATE)
    # actual temp close to simulated predicted temp -> high confidence
    actual = dict(VALID_STATE, temperature=simulated["predicted_temperature"])
    result = nitration.validate_against_live(simulated, actual)
    assert result["simulation_confidence"] == "high"
    assert result["sensor_fault_suspected"] is False


def test_validate_flags_sensor_fault_over_15_deg(nitration):
    simulated = nitration.simulate_step(VALID_STATE)
    actual = dict(VALID_STATE, temperature=simulated["predicted_temperature"] + 40)
    result = nitration.validate_against_live(simulated, actual)
    assert result["sensor_fault_suspected"] is True
    assert result["deviation_celsius"] == 40.0


def test_validate_low_confidence_on_missing_temp(nitration):
    simulated = nitration.simulate_step(VALID_STATE)
    result = nitration.validate_against_live(simulated, {"temperature": None})
    assert result["simulation_confidence"] == "low"


def test_medium_confidence_band(nitration):
    simulated = nitration.simulate_step(VALID_STATE)
    actual = dict(VALID_STATE, temperature=simulated["predicted_temperature"] + 30)
    result = nitration.validate_against_live(simulated, actual)
    assert result["simulation_confidence"] == "medium"
