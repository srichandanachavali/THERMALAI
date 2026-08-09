"""Federated-learning scaffold — gradient aggregation without raw data egress.

Phase 1: no FL framework (Flower/PySyft) yet. The local model computes a
*feature-importance delta* against the base RF and ships only that delta to
the central aggregator. Raw plant readings never leave the site.
"""

import pickle
from datetime import datetime, timezone

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier

from config import FEATURES, ORIGINAL_FEATURES
from risk_service import build_feature_vector

MODEL_PATH = 'saved-models/rf_model.pkl'
FEDERATED_PATH = 'saved-models/rf_model_federated.pkl'
LOCAL_WEIGHT = 0.7
GLOBAL_WEIGHT = 0.3


def _label_for(reading):
    """Derive a training label from a reading, mirroring the risk thresholds."""
    if reading.get('status'):
        return reading['status']
    score = reading.get('risk_score')
    if score is None:
        return None
    if score >= 70:
        return 'CRITICAL'
    if score >= 30:
        return 'WARNING'
    return 'SAFE'


class FederatedModel:
    """Picklable container carrying blended feature importances.

    A trained sklearn RandomForestClassifier exposes feature_importances_ as a
    read-only property, so the scaffold wraps it and persists the *blended*
    importances separately. Prediction still delegates to the underlying trees.
    """

    def __init__(self, estimator, feature_importances_):
        self.estimator = estimator
        self.feature_importances_ = list(feature_importances_)

    def predict(self, X):
        return self.estimator.predict(X)

    def predict_proba(self, X):
        return self.estimator.predict_proba(X)

    @property
    def classes_(self):
        return self.estimator.classes_


class LocalModelTrainer:
    """Trains on local readings and emits/consumes feature-importance deltas."""

    def __init__(self, reactor_id, model_path=MODEL_PATH, plant_id=None):
        self.reactor_id = reactor_id
        self.plant_id = plant_id
        self.model_path = model_path
        with open(model_path, 'rb') as f:
            self.base_model = pickle.load(f)

    def _training_frame(self, local_readings):
        """Build (X, y) from local readings; skip readings without labels."""
        rows, labels = [], []
        for r in local_readings:
            label = _label_for(r)
            if label is None:
                continue
            try:
                # build_feature_vector yields the full 15-field vector; slice to
                # ORIGINAL_FEATURES so it aligns with the base model's width.
                rows.append(build_feature_vector(r)[:len(ORIGINAL_FEATURES)])
                labels.append(label)
            except KeyError:
                continue
        if len(rows) < 10:
            return None, None
        return np.asarray(rows, dtype=float), np.asarray(labels)

    def compute_gradient_update(self, local_readings):
        """Train on local data; return only the feature-importance deltas."""
        X, y = self._training_frame(local_readings)
        if X is None:
            return None

        local_model = RandomForestClassifier(**self.base_model.get_params())
        local_model.fit(X, y)

        base_importance = np.asarray(self.base_model.feature_importances_)
        local_importance = np.asarray(local_model.feature_importances_)
        delta = (local_importance - base_importance).astype(float)

        return {
            'reactor_id': self.reactor_id,
            'plant_id': self.plant_id,
            'delta': [round(float(d), 6) for d in delta],
            'n_samples': int(len(X)),
            'timestamp': datetime.now(timezone.utc).isoformat(),
        }

    def apply_global_update(self, global_weights):
        """Blend base + global importances, re-normalize, persist the model."""
        global_arr = np.asarray(global_weights, dtype=float)
        local = np.asarray(self.base_model.feature_importances_)
        if global_arr.shape != local.shape:
            raise ValueError(
                f'global_weights shape {global_arr.shape} != base {local.shape}'
            )

        blended = LOCAL_WEIGHT * local + GLOBAL_WEIGHT * global_arr
        total = blended.sum()
        if total > 0:
            blended = blended / total

        federated = FederatedModel(self.base_model, blended.tolist())
        with open(FEDERATED_PATH, 'wb') as f:
            pickle.dump(federated, f)
        return federated.feature_importances_
