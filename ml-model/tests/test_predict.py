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
