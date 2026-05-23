"""
Tests for risk_engine.calculate_risk_score.

Uses a minimal RandomForestClassifier trained on synthetic data whose
feature ranges clearly separate the three classes, so predictions are
deterministic without needing the production pkl file.
"""

import numpy as np
import pytest
from sklearn.ensemble import RandomForestClassifier

from risk_engine import FEATURES, calculate_risk_score


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def mock_rf_model():
    """
    RandomForestClassifier trained on 30 synthetic samples per class.

    Training ranges are chosen so that the three test readings below
    (temp 118 / 155 / 210) fall unambiguously within SAFE / WARNING / CRITICAL
    regions, giving the forest enough signal to classify with high confidence.
    """
    rng = np.random.default_rng(42)
    n = 30

    def make_rows(temp_range, pressure_range, cooling_range,
                  reaction_range, roc_range):
        temp = rng.uniform(*temp_range, n)
        pressure = rng.uniform(*pressure_range, n)
        cooling = rng.uniform(*cooling_range, n)
        reaction = rng.uniform(*reaction_range, n)
        roc = rng.uniform(*roc_range, n)
        return np.column_stack([
            temp,
            pressure,
            reaction,
            cooling,
            roc,
            temp,                        # temp_rolling_avg ≈ temp
            pressure,                    # pressure_rolling_avg ≈ pressure
            np.zeros(n),                 # temp_acceleration
            pressure / temp,             # pressure_temp_ratio
            (1 - cooling) * temp,        # cooling_danger
        ])

    safe_X = make_rows(
        temp_range=(100, 130),
        pressure_range=(3.0, 4.5),
        cooling_range=(0.85, 0.97),
        reaction_range=(0.30, 0.50),
        roc_range=(-0.5, 0.5),
    )
    warn_X = make_rows(
        temp_range=(140, 165),
        pressure_range=(5.0, 7.0),
        cooling_range=(0.50, 0.72),
        reaction_range=(0.60, 0.78),
        roc_range=(1.0, 2.5),
    )
    crit_X = make_rows(
        temp_range=(190, 260),
        pressure_range=(7.5, 9.5),
        cooling_range=(0.15, 0.35),
        reaction_range=(0.85, 0.98),
        roc_range=(4.0, 7.0),
    )

    X = np.vstack([safe_X, warn_X, crit_X])
    y = ['SAFE'] * n + ['WARNING'] * n + ['CRITICAL'] * n

    clf = RandomForestClassifier(n_estimators=50, random_state=42)
    clf.fit(X, y)
    return clf


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def reading(temp, pressure, cooling, reaction_rate=0.5,
            temp_rate_of_change=0.0):
    return {
        'temperature': temp,
        'pressure': pressure,
        'cooling_efficiency': cooling,
        'reaction_rate': reaction_rate,
        'temp_rate_of_change': temp_rate_of_change,
    }


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

class TestOutputShape:
    def test_returns_all_keys(self, mock_rf_model):
        result = calculate_risk_score(
            reading(118, 3.8, 0.92), mock_rf_model
        )
        assert set(result.keys()) == {'risk_score', 'status', 'prediction', 'probabilities'}

    def test_probabilities_keys(self, mock_rf_model):
        result = calculate_risk_score(
            reading(118, 3.8, 0.92), mock_rf_model
        )
        assert set(result['probabilities'].keys()) == {'safe', 'warning', 'critical'}

    def test_probabilities_sum_to_100(self, mock_rf_model):
        result = calculate_risk_score(
            reading(118, 3.8, 0.92), mock_rf_model
        )
        total = sum(result['probabilities'].values())
        assert abs(total - 100.0) < 0.5  # rounding tolerance

    def test_risk_score_in_range(self, mock_rf_model):
        for temp, pressure, cooling in [
            (118, 3.8, 0.92),
            (155, 5.8, 0.62),
            (210, 8.5, 0.25),
        ]:
            result = calculate_risk_score(
                reading(temp, pressure, cooling), mock_rf_model
            )
            assert 0 <= result['risk_score'] <= 100


class TestScenarios:
    def test_safe_reactor(self, mock_rf_model):
        """temp=118°C, high cooling — well within safe operating range."""
        result = calculate_risk_score(
            reading(
                temp=118,
                pressure=3.8,
                cooling=0.92,
                reaction_rate=0.45,
                temp_rate_of_change=0.2,
            ),
            mock_rf_model,
        )
        assert result['status'] == 'SAFE'
        assert result['risk_score'] < 30

    def test_warning_reactor(self, mock_rf_model):
        """temp=155°C, degraded cooling — elevated but not yet critical."""
        result = calculate_risk_score(
            reading(
                temp=155,
                pressure=5.8,
                cooling=0.62,
                reaction_rate=0.70,
                temp_rate_of_change=1.5,
            ),
            mock_rf_model,
        )
        assert result['status'] == 'WARNING'
        assert 30 <= result['risk_score'] < 70

    def test_critical_reactor(self, mock_rf_model):
        """temp=210°C, cooling nearly failed — thermal runaway conditions."""
        result = calculate_risk_score(
            reading(
                temp=210,
                pressure=8.5,
                cooling=0.25,
                reaction_rate=0.92,
                temp_rate_of_change=5.2,
            ),
            mock_rf_model,
        )
        assert result['status'] == 'CRITICAL'
        assert result['risk_score'] >= 70


class TestDerivedFeatures:
    def test_pressure_temp_ratio_computed(self, mock_rf_model):
        """Module must compute pressure_temp_ratio even if not in reading."""
        r = {'temperature': 120, 'pressure': 4.8, 'cooling_efficiency': 0.9}
        result = calculate_risk_score(r, mock_rf_model)
        assert result['risk_score'] is not None  # no KeyError

    def test_cooling_danger_computed(self, mock_rf_model):
        """cooling_danger = (1 - cooling) * temp must not raise."""
        r = {'temperature': 150, 'pressure': 5.0, 'cooling_efficiency': 0.6}
        result = calculate_risk_score(r, mock_rf_model)
        assert result['risk_score'] is not None

    def test_optional_fields_default(self, mock_rf_model):
        """Minimal reading with only required fields must not raise."""
        r = {'temperature': 120, 'pressure': 4.0, 'cooling_efficiency': 0.88}
        result = calculate_risk_score(r, mock_rf_model)
        assert result['status'] in {'SAFE', 'WARNING', 'CRITICAL'}


class TestFeatureList:
    def test_features_count(self):
        assert len(FEATURES) == 10

    def test_required_features_present(self):
        required = {
            'temperature', 'pressure', 'reaction_rate', 'cooling_efficiency',
            'temp_rate_of_change', 'temp_rolling_avg', 'pressure_rolling_avg',
            'temp_acceleration', 'pressure_temp_ratio', 'cooling_danger',
        }
        assert set(FEATURES) == required
