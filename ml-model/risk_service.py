import logging
import pickle

import numpy as np
import pandas as pd

from config import FEATURES, CLASSES, LSTM_SEQUENCE_FIELDS, ORIGINAL_FEATURES
from features import build_feature_vector, compute_minutes_to_runaway

logger = logging.getLogger('thermalai.ml')

# RF lazy-loads on first request. LSTM is optional — when tensorflow isn't
# installed (free-tier) the ensemble falls back to RF-only (lstm_weight=0).
model = None
explainer = None
lstm_model = None
lstm_scaler = None
lstm_label_encoder = None

_CLASS_ORDER = CLASSES


def load_models():
    global model, explainer, lstm_model, lstm_scaler, lstm_label_encoder
    if model is not None:
        return
    with open('saved-models/rf_model.pkl', 'rb') as f:
        model = pickle.load(f)
    try:
        import shap
        explainer = shap.TreeExplainer(model)
    except Exception:
        explainer = None
    try:
        from tensorflow.keras.models import load_model as _load
        lstm_model = _load('saved-models/lstm_model.h5')
        with open('saved-models/lstm_scaler.pkl', 'rb') as f:
            lstm_scaler = pickle.load(f)
        with open('saved-models/lstm_label_encoder.pkl', 'rb') as f:
            lstm_label_encoder = pickle.load(f)
        print('LSTM model loaded!')
    except Exception:
        lstm_model = None
    print('RF model loaded!')


def build_lstm_sequence(history, reading, scaler):
    """(1, 20, 9) scaled sequence from buffered dicts, padded to SEQUENCE_LENGTH."""
    from config import SEQUENCE_LENGTH
    rows = [r for r in (history or [])] + [reading]
    vecs = [[r.get(f, 0.0) for f in LSTM_SEQUENCE_FIELDS] for r in rows]
    if len(vecs) < SEQUENCE_LENGTH:
        pad = [vecs[0]] * (SEQUENCE_LENGTH - len(vecs))
        vecs = pad + vecs
    seq = np.array([scaler.transform(np.array(vecs, dtype=float))])
    return seq


def _probs_to_canonical(probs, class_labels):
    d = dict(zip(class_labels, probs))
    return [d.get(c, 0.0) for c in _CLASS_ORDER]


def shap_top_drivers(reading, history=None):
    """Return (top_drivers, confidence) using SHAP — same contract /explain uses.

    Drivers carry {sensor, contribution, current_value, direction, human_readable}.
    """
    if explainer is None:
        return [], 'medium'
    engineered = np.array([build_feature_vector(reading, history)])
    active_features = FEATURES
    try:
        X = pd.DataFrame(engineered, columns=FEATURES)
        model.predict(X)
    except ValueError:
        # Stale-width artifact — fall back to the columns it was trained on.
        k = getattr(model, 'n_features_in_', len(ORIGINAL_FEATURES))
        active_features = FEATURES[:k]
        X = pd.DataFrame(engineered[:, :k], columns=active_features)
    pred = model.predict(X)[0]
    class_idx = list(model.classes_).index(pred)
    shap_values = explainer.shap_values(X)
    if isinstance(shap_values, list):
        vals = np.asarray(shap_values[class_idx][0])
    else:
        sv = np.asarray(shap_values)
        vals = sv[0, :, class_idx] if sv.ndim == 3 else sv[0]
    top = sorted(zip(active_features, vals), key=lambda x: abs(x[1]), reverse=True)[:3]
    proba = model.predict_proba(X)[0]
    confidence = 'high' if max(proba) > 0.7 else 'medium'
    drivers = []
    for rank, (name, contribution) in enumerate(top, start=1):
        label = name.replace('_', ' ').title()
        direction = 'increasing' if contribution >= 0 else 'decreasing'
        current_value = engineered[0][active_features.index(name)]
        drivers.append({
            'sensor': name,
            'contribution': round(float(contribution), 4),
            'direction': direction,
            'current_value': round(float(current_value), 2),
            'human_readable': (
                f"{label} is the {rank}{_ordinal(rank)} strongest driver "
                f"(current {current_value:.2f}) pushing risk "
                f"{'up' if direction == 'increasing' else 'down'}"
            ),
        })
    return drivers, confidence


def _ordinal(n):
    if 10 <= n % 100 <= 20:
        return 'th'
    return {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')


def top_risk_factors(vec):
    """Top 3 drivers by (global importance x current-value magnitude)."""
    imp = np.asarray(model.feature_importances_)
    k = len(imp)
    active = FEATURES[:k]
    mag = imp * np.abs(vec[:k])
    order = np.argsort(mag)[::-1][:3]
    factors = []
    for i in order:
        name = active[i]
        label = name.replace('_', ' ').title()
        factors.append({
            'feature': name,
            'importance': round(float(imp[i]), 4),
            'value': round(float(vec[i]), 2),
            'human_readable': f"{label} elevated (importance {imp[i]:.3f})",
        })
    return factors


def calculate_risk_score(reading, history=None):
    vec = build_feature_vector(reading, history)
    df = pd.DataFrame([vec], columns=FEATURES)
    try:
        rf_probs = model.predict_proba(df)[0]
    except ValueError:
        # Stale-width artifact — fall back to the columns it was trained on.
        k = getattr(model, 'n_features_in_', len(ORIGINAL_FEATURES))
        df = pd.DataFrame([vec[:k]], columns=FEATURES[:k])
        rf_probs = model.predict_proba(df)[0]
    rf_canon = _probs_to_canonical(rf_probs, list(model.classes_))

    seq_len = len(history) + 1 if history else 1
    lstm_canon = None
    if lstm_model is not None and lstm_scaler is not None:
        seq = build_lstm_sequence(history, reading, lstm_scaler)
        p = lstm_model.predict(seq, verbose=0)[0]
        lstm_canon = _probs_to_canonical(p, list(lstm_label_encoder.classes_))

    if lstm_canon is not None:
        if seq_len >= 20:
            rf_w, lstm_w = 0.35, 0.65
        elif seq_len >= 10:
            rf_w, lstm_w = 0.50, 0.50
        else:
            rf_w, lstm_w = 0.80, 0.20
    else:
        rf_w, lstm_w = 1.0, 0.0

    if lstm_canon is None:
        blended = list(rf_canon)
    else:
        blended = [rf_w * rf_canon[i] + lstm_w * lstm_canon[i] for i in range(5)]
    total = sum(blended) or 1.0
    blended = [b / total for b in blended]

    rf_class = _CLASS_ORDER[int(np.argmax(rf_canon))]
    lstm_class = (_CLASS_ORDER[int(np.argmax(lstm_canon))]
                  if lstm_canon is not None else rf_class)
    agreement = 1.0 if rf_class == lstm_class else 0.0

    _, degrading, warning, critical, _ = blended
    risk_score = degrading * 25 + warning * 55 + critical * 100
    risk_score = round(min(100, max(0, risk_score)), 1)
    prediction = _CLASS_ORDER[int(np.argmax(blended))]

    max_prob = max(blended)
    if agreement and max_prob > 0.70:
        confidence = 'high'
    elif max_prob > 0.50:
        confidence = 'medium'
    else:
        confidence = 'low'

    # 3-state status for the backend Reactor schema / alerting / SIL.
    if risk_score >= 70:
        status = 'CRITICAL'
    elif risk_score >= 30:
        status = 'WARNING'
    else:
        status = 'SAFE'

    probs = {k: round(float(v * 100), 1) for k, v in zip(
        ('nominal', 'degrading', 'warning', 'critical', 'recovery'), blended)}
    return {
        'risk_score': float(risk_score), 'status': status,
        'prediction': prediction, 'confidence': confidence,
        'rf_weight_used': float(rf_w), 'lstm_weight_used': float(lstm_w),
        'models_agree': bool(agreement),
        'probabilities': probs,
        'minutes_to_runaway': compute_minutes_to_runaway(reading, risk_score, status),
        'top_risk_factors': top_risk_factors(vec),
        'feature_vector': [round(float(v), 4) for v in vec],
    }
