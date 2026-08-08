from flask import Blueprint, request, jsonify

from config import CRITICAL_TEMP
from risk_service import load_models, calculate_risk_score

risk_bp = Blueprint('risk', __name__)


@risk_bp.route('/predict', methods=['POST'])
def predict():
    try:
        load_models()
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        result = calculate_risk_score(data)
        return jsonify({
            'success': True,
            'reactor_id': data.get('reactor_id', 'unknown'),
            'risk_score': result['risk_score'],
            'status': result['status'],
            'prediction': result['prediction'],
            'probabilities': result['probabilities']
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
        result = calculate_risk_score(data)
        probs = result['probabilities']
        return jsonify({
            'success': True, 'reactor_id': reactor_id,
            'lstm_prediction': result['prediction'],
            'lstm_risk_score': result['risk_score'],
            'lstm_confidence': max(probs['safe'], probs['warning'], probs['critical']),
            'lstm_probabilities': probs
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
        temp = data['temperature']
        pressure = data['pressure']
        cooling = data['cooling_efficiency']
        risk_score = data.get('risk_score', 0)
        temp_roc = data.get('temp_rate_of_change', 0)
        reasons = []
        recommendations = []
        if temp > 200:
            reasons.append(f"🌡️ Temperature critically high at {temp}°C — safe limit is 135°C")
            recommendations.append("Immediately reduce reaction rate")
        elif temp > 160:
            reasons.append(f"🌡️ Temperature dangerously elevated at {temp}°C")
            recommendations.append("Increase cooling flow rate")
        elif temp > 135:
            reasons.append(f"🌡️ Temperature above safe threshold at {temp}°C")
            recommendations.append("Monitor temperature closely")
        if temp_roc > 5:
            reasons.append(f"⚡ Temperature accelerating rapidly — rising {round(temp_roc, 1)}°C per cycle")
            recommendations.append("Emergency cooling activation required")
        elif temp_roc > 2:
            reasons.append(f"⚡ Temperature rising faster than normal — {round(temp_roc, 1)}°C per cycle")
            recommendations.append("Reduce heat input immediately")
        if cooling < 0.3:
            reasons.append(f"❄️ Cooling system critically failing — only {round(cooling*100)}% efficiency")
            recommendations.append("Switch to backup cooling system")
        elif cooling < 0.5:
            reasons.append(f"❄️ Cooling efficiency dangerously low at {round(cooling*100)}%")
            recommendations.append("Inspect and repair cooling system")
        elif cooling < 0.7:
            reasons.append(f"❄️ Cooling efficiency below normal at {round(cooling*100)}%")
            recommendations.append("Check cooling system performance")
        if pressure > 8:
            reasons.append(f"💨 Pressure critically high at {pressure} bar — safe limit is 4.5 bar")
            recommendations.append("Open pressure relief valve immediately")
        elif pressure > 6:
            reasons.append(f"💨 Pressure elevated at {pressure} bar")
            recommendations.append("Reduce reaction rate to lower pressure")
        elif pressure > 4.5:
            reasons.append(f"💨 Pressure above safe threshold at {pressure} bar")
            recommendations.append("Monitor pressure closely")
        if risk_score >= 70:
            overall = "IMMEDIATE ACTION REQUIRED — Thermal runaway imminent"
        elif risk_score >= 30:
            overall = "CAUTION — Reactor showing signs of instability"
        else:
            overall = "Reactor operating within safe parameters"
        if not reasons:
            reasons.append("✅ All parameters within safe operating range")
            recommendations.append("Continue normal operations")
        return jsonify({
            'success': True, 'overall': overall,
            'reasons': reasons, 'recommendations': recommendations, 'risk_score': risk_score
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
