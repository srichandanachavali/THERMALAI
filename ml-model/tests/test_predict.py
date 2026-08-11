"""End-to-end test of the POST /predict route via the Flask test client.

Injects a synthetic RandomForestClassifier (trained on the original 10
feature columns) so prediction is deterministic and independent of the
committed rf_model.pkl artifact.
"""

import numpy as np
import pytest
from sklearn.ensemble import RandomForestClassifier

from app import app


@pytest.fixture(scope="module")
def mock_model():
    """RF trained on the 10 ORIGINAL_FEATURES so the ValueError fallback
    in calculate_risk_score slices the 15-col frame correctly."""
    rng = np.random.default_rng(42)
    n = 30

    def rows(temp_r, pres_r, cool_r, react_r, roc_r):
        temp = rng.uniform(*temp_r, n)
        pressure = rng.uniform(*pres_r, n)
        reaction = rng.uniform(*react_r, n)
        cooling = rng.uniform(*cool_r, n)
        roc = rng.uniform(*roc_r, n)
        return np.column_stack([
            temp, pressure, reaction, cooling, roc,
            temp,                       # temp_rolling_avg
            pressure,                   # pressure_rolling_avg
            np.zeros(n),                # temp_acceleration
            pressure / temp,            # pressure_temp_ratio
            (1 - cooling) * temp,       # cooling_danger
        ])

    safe = rows((100, 130), (3.0, 4.5), (0.85, 0.97), (0.30, 0.50), (-0.5, 0.5))
    warn = rows((140, 165), (5.0, 7.0), (0.50, 0.72), (0.60, 0.78), (1.0, 2.5))
    crit = rows((190, 260), (7.5, 9.5), (0.15, 0.35), (0.85, 0.98), (4.0, 7.0))

    X = np.vstack([safe, warn, crit])
    y = ['SAFE'] * n + ['WARNING'] * n + ['CRITICAL'] * n
    clf = RandomForestClassifier(n_estimators=50, random_state=42)
    clf.fit(X, y)
    return clf


@pytest.fixture()
def client(monkeypatch, mock_model):
    import risk_service
    monkeypatch.setattr(risk_service, 'model', mock_model)
    app.config['TESTING'] = True
    return app.test_client()


SENSOR_DATA = {
    'reactor_id': 'A',
    'temperature': 118.0,
    'pressure': 3.8,
    'reaction_rate': 0.45,
    'cooling_efficiency': 0.92,
    'temp_rate_of_change': 0.2,
}


def test_predict_returns_200(client):
    res = client.post('/predict', json=SENSOR_DATA)
    assert res.status_code == 200


def test_predict_risk_score_between_0_and_100(client):
    res = client.post('/predict', json=SENSOR_DATA)
    data = res.get_json()
    assert data['success'] is True
    assert 0 <= data['risk_score'] <= 100


def test_predict_includes_status_and_reactor(client):
    res = client.post('/predict', json=SENSOR_DATA)
    data = res.get_json()
    assert data['reactor_id'] == 'A'
    assert data['status'] in {'SAFE', 'WARNING', 'CRITICAL'}


def _fake_result(risk_score, status):
    """Shape that the /predict jsonify reads from calculate_risk_score's return."""
    return {
        'risk_score': float(risk_score),
        'status': status,
        'prediction': status,
        'confidence': 0.9,
        'rf_weight_used': 1.0,
        'lstm_weight_used': 0.0,
        'models_agree': True,
        'probabilities': {'SAFE': 0.3, 'WARNING': 0.6, 'CRITICAL': 0.1},
        'minutes_to_runaway': 18.0,
        'top_risk_factors': [('temperature', 0.4)],
    }


def _critical_alert():
    return [{'severity': 'CRITICAL', 'parameter': 'temperature', 'message': 'over limit'}]


def _safe_validation():
    """Validation dict with no suspected sensor fault, so the +20 fault boost
    never fires and only the +15 parameter-alert boost changes the outcome."""
    return {
        'validated_reading': SENSOR_DATA,
        'data_quality': 'good',
        'sensor_faults': [],
        'temp_validation': {
            'voter_spread_celsius': 0.0,
            'sensor_fault_suspected': False,
            'fault_note': None,
        },
    }


def _post_with_boost(client, monkeypatch, base_risk, base_status):
    """POST /predict with a mocked model score, a forced CRITICAL parameter
    alert (+15), and a voting layer that reports no sensor fault (+20 suppressed).
    This isolates the parameter-alert boost so only it can change the outcome."""
    import routes_risk
    monkeypatch.setattr(routes_risk, 'calculate_risk_score',
                        lambda d, h=None: _fake_result(base_risk, base_status))
    monkeypatch.setattr(routes_risk, 'parameter_alerts', lambda d: _critical_alert())
    monkeypatch.setattr(routes_risk.voting_layer, 'validate_all',
                        lambda d: _safe_validation())
    return client.post('/predict', json=SENSOR_DATA).get_json()


def test_parameter_critical_boost_flips_status_safe_to_warning(client, monkeypatch):
    # Regression: a CRITICAL alert (+15) must push 25 -> 40 and flip status to
    # WARNING. Before the fix, status stayed SAFE (a false-safe).
    data = _post_with_boost(client, monkeypatch, base_risk=25, base_status='SAFE')
    assert data['risk_score'] == 40.0
    assert data['status'] == 'WARNING'


def test_parameter_critical_boost_flips_status_warning_to_critical(client, monkeypatch):
    # A CRITICAL alert (+15) must push 60 -> 75 and flip status to CRITICAL.
    data = _post_with_boost(client, monkeypatch, base_risk=60, base_status='WARNING')
    assert data['risk_score'] == 75.0
    assert data['status'] == 'CRITICAL'
