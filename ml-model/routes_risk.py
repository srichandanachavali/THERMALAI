from flask import Blueprint, request, jsonify

from config import CRITICAL_TEMP
from risk_service import load_models, calculate_risk_score, shap_top_drivers
from safety_alerts import parameter_alerts
from sequence_buffer import update_sequence_buffer, reactor_buffers, reactor_history
from explain_service import build_explanation
from sensor_voting import SensorVotingLayer
from kalman_filter import ReactorKalmanFilter
import logging

logger = logging.getLogger('thermalai.ml')

risk_bp = Blueprint('risk', __name__)

# Module-level singletons
voting_layer = SensorVotingLayer()
kalman = ReactorKalmanFilter(process_noise=0.05, measurement_noise=0.8)


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
