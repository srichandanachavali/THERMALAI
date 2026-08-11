from flask import Blueprint, request, jsonify

import math
import os
import pickle

import pandas as pd

from config import CRITICAL_TEMP
from risk_service import load_models, calculate_risk_score, shap_top_drivers
from safety_alerts import parameter_alerts
from sequence_buffer import update_sequence_buffer, reactor_buffers, reactor_history
from explain_service import build_explanation
from sensor_voting import SensorVotingLayer
from kalman_filter import ReactorKalmanFilter
from kinetics import REACTOR_CONFIG, R_GAS
import logging

logger = logging.getLogger('thermalai.ml')

risk_bp = Blueprint('risk', __name__)

# Module-level singletons
voting_layer = SensorVotingLayer()
kalman = ReactorKalmanFilter(process_noise=0.05, measurement_noise=0.8)

# XGBoost lazy-loads on first request (mirrors risk_service.load_models).
xgb_model = None
xgb_encoder = None

# The 10 features train_xgboost.py trains on.
XGB_FEATURES = [
    'temperature',
    'pressure',
    'reaction_rate',
    'cooling_efficiency',
    'temp_rate_of_change',
    'temp_rolling_avg',
    'pressure_rolling_avg',
    'temp_acceleration',
    'pressure_temp_ratio',
    'cooling_danger',
]

# Reactors use canonical ISA S5.1 slugs (R-101…R-301); pass them straight through.
# Unknown / missing IDs fall back to the R-101 (nitration) config.
_REACTOR_TO_KINETICS = {
    'R-101': 'R-101', 'R-102': 'R-102',
    'R-201': 'R-201', 'R-202': 'R-202', 'R-301': 'R-301',
}


def load_xgb_models():
    """Lazy-load the XGBoost classifier and its LabelEncoder."""
    global xgb_model, xgb_encoder
    if xgb_model is not None:
        return
    with open('saved-models/xgb_model.pkl', 'rb') as f:
        xgb_model = pickle.load(f)
    with open('saved-models/label_encoder.pkl', 'rb') as f:
        xgb_encoder = pickle.load(f)


def _resolve_kinetics_config(reactor_id):
    """Map reactor_id -> REACTOR_CONFIG entry, defaulting to R-101 on miss.

    kinetics.REACTOR_CONFIG is keyed by canonical slug (R-101…R-301), so
    resolve by tag rather than dict key.
    """
    target_tag = _REACTOR_TO_KINETICS.get(reactor_id, 'R-101')
    for entry in REACTOR_CONFIG.values():
        if entry.get('tag') == target_tag:
            return entry
    return REACTOR_CONFIG['R-101']


@risk_bp.route('/predict', methods=['POST'])
def predict():
    try:
        load_models()
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # STEP 1: 2-of-3 temp voting
        validation = voting_layer.validate_all(data)

        # STEP 2: Kalman smooth
        reactor_id = data.get('reactor_id', 'unknown')
        smoothed_data = kalman.filter_reading(reactor_id, validation['validated_reading'])

        # STEP 3: Risk
        history = reactor_history.get(reactor_id, [])
        result = calculate_risk_score(smoothed_data, history)
        update_sequence_buffer(reactor_id, smoothed_data)

        p_alerts = parameter_alerts(smoothed_data)
        risk = result['risk_score']
        status = result['status']  # safe default
        has_critical = any(a['severity'] == 'CRITICAL' for a in p_alerts)
        has_warning = any(a['severity'] == 'WARNING' for a in p_alerts)
        if has_critical:
            risk = min(100, risk + 15)
        elif has_warning:
            risk = min(100, risk + 5)

        # STEP 4: Fault boost
        fault_suspected = validation['temp_validation']['sensor_fault_suspected']
        if fault_suspected:
            risk = min(100, risk + 20)

        # Recompute status once; a suspected fault is never SAFE.
        if risk >= 70:
            status = 'CRITICAL'
        elif risk >= 30 or fault_suspected:
            status = 'WARNING'
        else:
            status = 'SAFE'

        return jsonify({
            'success': True,
            'reactor_id': reactor_id,
            'risk_score': round(risk, 1),
            'status': status,
            'prediction': result['prediction'],
            'confidence': result['confidence'],
            'rf_weight_used': result['rf_weight_used'],
            'lstm_weight_used': result['lstm_weight_used'],
            'models_agree': result['models_agree'],
            'probabilities': result['probabilities'],
            'minutes_to_runaway': result['minutes_to_runaway'],
            'top_risk_factors': result['top_risk_factors'],
            'parameter_alerts': p_alerts,
            # Sensor validation metadata
            'data_quality': validation['data_quality'],
            'sensor_validation': {
                'voter_spread_celsius': validation['temp_validation']['voter_spread_celsius'],
                'sensor_fault_suspected': validation['temp_validation']['sensor_fault_suspected'],
                'sensor_faults': validation['sensor_faults'],
                'fault_note': validation['temp_validation']['fault_note'],
            }
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@risk_bp.route('/predict-lstm', methods=['POST'])
def predict_lstm():
    # RF produces the LSTM-format response (TF removed for free tier; RF-based).
    try:
        load_models()
        data = request.get_json()
        reactor_id = data.get('reactor_id', 'unknown')
        # 10-field sequence buffer (5 original + 5 IEC 61511).
        update_sequence_buffer(reactor_id, data)
        try:
            # Deployed model isn't LSTM-retrained, so score via RF (fall back
            # if the wider sequence shape is rejected).
            result = calculate_risk_score(data)
        except ValueError as e:
            logger.warning('LSTM input shape mismatch; falling back to RF-only: %s', e)
            result = calculate_risk_score(data)
        probs = result['probabilities']
        return jsonify({
            'success': True, 'reactor_id': reactor_id,
            'lstm_prediction': result['prediction'],
            'lstm_risk_score': result['risk_score'],
            'lstm_confidence': max(probs['nominal'], probs['warning'], probs['critical']),
            'lstm_probabilities': probs,
            'sequence_length': len(reactor_buffers.get(reactor_id, []))
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@risk_bp.route('/predict/batch', methods=['POST'])
def predict_batch():
    try:
        load_models()
        readings = request.get_json()
        results = []
        for reading in readings:
            result = calculate_risk_score(reading)
            results.append({'reactor_id': reading.get('reactor_id'), 'risk_score': result['risk_score'], 'status': result['status']})
        return jsonify({'success': True, 'results': results})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@risk_bp.route('/predict-time', methods=['POST'])
def predict_time():
    try:
        data = request.get_json()
        temp = data['temperature']
        temp_roc = data.get('temp_rate_of_change', 0)
        risk_score = data.get('risk_score', 0)
        status = data.get('status', 'SAFE')
        if status == 'CRITICAL':
            minutes = 0
            message = "🔴 CRITICAL — Thermal runaway in progress!"
            urgency = "CRITICAL"
        elif status == 'WARNING' and temp_roc > 0:
            degrees_remaining = CRITICAL_TEMP - temp
            if degrees_remaining <= 0:
                minutes = 0
                message = "🔴 CRITICAL — Thermal runaway in progress!"
                urgency = "CRITICAL"
            else:
                cycles_remaining = degrees_remaining / temp_roc
                minutes = round((cycles_remaining * 2) / 60, 1)
                if minutes < 5:
                    message = f"🔴 CRITICAL in {minutes} minutes — Immediate action required!"
                    urgency = "CRITICAL"
                elif minutes < 15:
                    message = f"⚠️ Estimated critical in {minutes} minutes — Act now!"
                    urgency = "WARNING"
                else:
                    message = f"⚠️ Estimated critical in {minutes} minutes — Monitor closely"
                    urgency = "CAUTION"
        else:
            minutes = None
            message = "✅ Reactor operating safely — no imminent danger"
            urgency = "SAFE"
        return jsonify({
            'success': True, 'minutes_to_critical': minutes,
            'message': message, 'urgency': urgency,
            'current_temp': temp, 'temp_rate_of_change': temp_roc, 'status': status
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@risk_bp.route('/explain', methods=['POST'])
def explain():
    try:
        data = request.get_json()
        reasons, recommendations, overall = build_explanation(
            data['temperature'], data['pressure'], data['cooling_efficiency'],
            data.get('temp_rate_of_change', 0), data.get('risk_score', 0))
        load_models()
        drivers, explain_conf = shap_top_drivers(data)
        return jsonify({
            'success': True, 'overall': overall,
            'reasons': reasons, 'recommendations': recommendations,
            'risk_score': data.get('risk_score', 0),
            'top_drivers': drivers, 'explanation_confidence': explain_conf
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@risk_bp.route('/predict-xgb', methods=['POST'])
def predict_xgb():
    # Real XGBoost inference on the 10 training features. Severity-weights class
    # probabilities by substring (class names are unknown at runtime).
    try:
        load_xgb_models()
    except Exception as e:
        logger.error('XGBoost model unavailable: %s', e)
        return jsonify({'error': 'XGBoost model unavailable', 'detail': str(e)}), 500

    try:
        data = request.get_json() or {}
        reactor_id = data.get('reactor_id', 'unknown')
        temperature = data.get('temperature', 0.0)
        pressure = data.get('pressure', 0.0)

        row = {
            'temperature': temperature,
            'pressure': pressure,
            'reaction_rate': data.get('reaction_rate', 0.5),
            'cooling_efficiency': data.get('cooling_efficiency', 0.92),
            'temp_rate_of_change': data.get('temp_rate_of_change', 0.0),
            'temp_rolling_avg': data.get('temp_rolling_avg', temperature),
            'pressure_rolling_avg': data.get('pressure_rolling_avg', pressure),
            'temp_acceleration': data.get('temp_acceleration', 0.0),
            'pressure_temp_ratio': data.get('pressure_temp_ratio', 0.0),
            'cooling_danger': data.get('cooling_danger', 0.0),
        }
        df = pd.DataFrame([row], columns=XGB_FEATURES)
        probs = xgb_model.predict_proba(df)[0]
        classes = list(xgb_model.classes_)

        weights = {}
        for cls in classes:
            c = str(cls).lower()
            if 'critical' in c:
                weights[cls] = 100
            elif 'warning' in c:
                weights[cls] = 55
            elif 'degrading' in c:
                weights[cls] = 25
            else:  # nominal / safe / recovery
                weights[cls] = 0

        risk = sum(weights[c] * float(p) for c, p in zip(classes, probs))
        risk = round(min(100, max(0, risk)), 1)

        if risk >= 70:
            prediction = 'CRITICAL'
        elif risk >= 30:
            prediction = 'WARNING'
        else:
            prediction = 'SAFE'

        confidence = round(float(max(probs)) * 100, 1)
        probabilities = {str(c): round(float(p) * 100, 1) for c, p in zip(classes, probs)}

        return jsonify({
            'success': True, 'reactor_id': reactor_id,
            'xgb_prediction': prediction, 'xgb_risk_score': risk,
            'xgb_confidence': confidence, 'xgb_probabilities': probabilities,
        })
    except Exception as e:
        logger.error('XGBoost predict failed: %s', e)
        return jsonify({'error': str(e)}), 500


@risk_bp.route('/predict-physics', methods=['POST'])
def predict_physics():
    # Deterministic Arrhenius risk: k = A * exp(-Ea/(R*T)); reaction rate anchored
    # so design point -> 0.5 (nominal) and runaway -> 1.0 (critical).
    try:
        data = request.get_json() or {}
        if 'temperature' not in data or data['temperature'] is None:
            return jsonify({'error': 'temperature is required'}), 400

        temperature = float(data['temperature'])
        cooling_efficiency = float(data.get('cooling_efficiency', 0.92))
        reactor_id = data.get('reactor_id', 'unknown')

        config = _resolve_kinetics_config(reactor_id)

        k = config['A'] * math.exp(-config['Ea'] / (R_GAS * (temperature + 273.15)))
        t_design = 0.5 * (config['tmin'] + config['tmax']) + 273.15
        k_design = config['A'] * math.exp(-config['Ea'] / (R_GAS * t_design))
        reaction_rate = min(1.0, max(0.0, 0.5 * k / k_design))

        risk = round(min(100, max(0, (reaction_rate - 0.5) / 0.5 * 100)), 1)

        if risk >= 70:
            prediction = 'CRITICAL'
        elif risk >= 30:
            prediction = 'WARNING'
        else:
            prediction = 'SAFE'

        if reaction_rate >= 0.9:
            note = 'Thermal runaway imminent — heat generation far exceeds cooling capacity.'
        elif reaction_rate >= 0.75:
            note = 'High reaction rate approaching runaway — cooling capacity is limited.'
        elif reaction_rate >= 0.5:
            note = 'Reaction rate above design nominal — monitor cooling closely.'
        else:
            note = 'Reactor operating below design reaction rate — stable.'

        return jsonify({
            'success': True, 'reactor_id': reactor_id,
            'physics_prediction': prediction, 'physics_risk_score': risk,
            'reaction_rate': round(reaction_rate, 4), 'note': note,
        })
    except Exception as e:
        logger.error('Physics predict failed: %s', e)
        return jsonify({'error': str(e)}), 500
