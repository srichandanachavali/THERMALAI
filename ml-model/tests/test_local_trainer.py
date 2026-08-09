"""Tests for the federated local trainer scaffold."""

import os
import pickle
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "federated"))

import pytest

from local_trainer import LocalModelTrainer, FederatedModel

# The base model must exist to test the trainer (trained artifact).
pytest.importorskip("sklearn")


@pytest.fixture(scope="module")
def trainer():
    return LocalModelTrainer("A", plant_id="PLANT_ALPHA")


def make_readings(n):
    readings = []
    for i in range(n):
        t = 110 + (i % 3) * 30
        readings.append({
            'temperature': float(t),
            'pressure': 6.0,
            'cooling_efficiency': 0.5,
            'reaction_rate': 0.7,
            'temp_rate_of_change': 3.0,
            'risk_score': 80 if i % 3 == 2 else (45 if i % 3 == 1 else 10),
        })
    return readings


def test_compute_gradient_update_shape(trainer):
    update = trainer.compute_gradient_update(make_readings(60))
    assert update is not None
    assert update['reactor_id'] == 'A'
    assert update['plant_id'] == 'PLANT_ALPHA'
    assert update['n_samples'] == 60
    assert len(update['delta']) == len(trainer.base_model.feature_importances_)
    assert all(isinstance(d, float) for d in update['delta'])


def test_update_contains_no_raw_readings(trainer):
    update = trainer.compute_gradient_update(make_readings(60))
    payload = str(update)
    # Raw sensor values must never be serialized into the update.
    assert 'temperature' not in payload
    assert 'pressure' not in payload
    assert 'cooling_efficiency' not in payload
    # Only the aggregate delta survives.
    assert set(update.keys()) == {'reactor_id', 'plant_id', 'delta', 'n_samples', 'timestamp'}


def test_apply_global_update_renormalizes(trainer, tmp_path):
    # Point the output at a temp path so tests never touch real saved-models.
    global_path = str(tmp_path / 'rf_model_federated.pkl')
    import local_trainer as lt
    orig = lt.FEDERATED_PATH
    lt.FEDERATED_PATH = global_path
    try:
        weights = [0.1] * len(trainer.base_model.feature_importances_)
        result = trainer.apply_global_update(weights)
        assert abs(sum(result) - 1.0) < 1e-6
        with open(global_path, 'rb') as f:
            obj = pickle.load(f)
        assert isinstance(obj, FederatedModel)
        assert abs(sum(obj.feature_importances_) - 1.0) < 1e-6
    finally:
        lt.FEDERATED_PATH = orig
