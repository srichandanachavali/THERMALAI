from flask import Blueprint, request, jsonify

from config import CRITICAL_TEMP
from risk_service import load_models, calculate_risk_score, shap_top_drivers
from safety_alerts import parameter_alerts
from sequence_buffer import update_sequence_buffer, reactor_buffers, reactor_history
from explain_service import build_explanation
import logging

logger = logging.getLogger('thermalai.ml')

risk_bp = Blueprint('risk', __name__)


@risk_bp.route('/predict', methods=['POST'])
def predict():
    try:
        load_models()
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        # Feed the reactor's sequence buffer BEFORE scoring so online rolling
        # stats and (if present) the LSTM sequence use prior readings.
        reactor_id = data.get('reactor_id', 'unknown')
        history = reactor_history.get(reactor_id, [])
        result = calculate_risk_score(data, history)
        update_sequence_buffer(reactor_id, data)

        p_alerts = parameter_alerts(data)
        risk = result['risk_score']
        has_critical = any(a['severity'] == 'CRITICAL' for a in p_alerts)
        has_warning = any(a['severity'] == 'WARNING' for a in p_alerts)
        if has_critical:
            risk = min(100, risk + 15)
        elif has_warning:
            risk = min(100, risk + 5)
        if risk >= 70:
            status = 'CRITICAL'
        elif risk >= 30:
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
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@risk_bp.route('/predict-lstm', methods=['POST'])
def predict_lstm():
    # Uses RF model to produce the LSTM-format response expected by the backend.
    # TensorFlow removed for free-tier compatibility; ensemble score is RF-based.
    try:
        load_models()
        data = request.get_json()
        reactor_id = data.get('reactor_id', 'unknown')
        # Maintain the 10-field sequence buffer (5 original + 5 IEC 61511 sensors).
        update_sequence_buffer(reactor_id, data)
        try:
            # A real LSTM would predict on the buffered sequence. The deployed
            # model is not retrained for it, so score via RF. If the LSTM path
            # ever rejects the (now wider) sequence shape, fall back to RF-only.
            result = calculate_risk_score(data)
        except ValueError as e:
            logger.warning('LSTM input shape mismatch; falling back to RF-only: %s', e)
            result = calculate_risk_score(data)
        probs = result['probabilities']
        return jsonify({
            'success': True, 'reactor_id': reactor_id,
            'lstm_prediction': result['prediction'],
            'lstm_risk_score': result['risk_score'],
            'lstm_confidence': max(probs['safe'], probs['warning'], probs['critical']),
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
