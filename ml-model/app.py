from flask import Flask, request, jsonify
from flask_cors import CORS
import pandas as pd
import numpy as np
import pickle

app = Flask(__name__)
CORS(app)

# Load model on startup
with open('saved-models/rf_model.pkl', 'rb') as f:
    model = pickle.load(f)

print("✅ ThermalAI model loaded and ready!")

FEATURES = [
    'temperature',
    'pressure',
    'reaction_rate',
    'cooling_efficiency',
    'temp_rate_of_change',
    'temp_rolling_avg',
    'pressure_rolling_avg',
    'temp_acceleration',
    'pressure_temp_ratio',
    'cooling_danger'
]

def calculate_risk_score(reading):
    temp = reading['temperature']
    pressure = reading['pressure']
    cooling = reading['cooling_efficiency']

    features = {
        'temperature': temp,
        'pressure': pressure,
        'reaction_rate': reading.get('reaction_rate', 0.5),
        'cooling_efficiency': cooling,
        'temp_rate_of_change': reading.get('temp_rate_of_change', 0),
        'temp_rolling_avg': reading.get('temp_rolling_avg', temp),
        'pressure_rolling_avg': reading.get('pressure_rolling_avg', pressure),
        'temp_acceleration': reading.get('temp_acceleration', 0),
        'pressure_temp_ratio': round(pressure / temp, 4),
        'cooling_danger': round((1 - cooling) * temp, 2)
    }

    df = pd.DataFrame([features])
    prediction = model.predict(df)[0]
    probabilities = model.predict_proba(df)[0]
    classes = model.classes_
    prob_dict = dict(zip(classes, probabilities))

    safe_prob = prob_dict.get('SAFE', 0)
    warning_prob = prob_dict.get('WARNING', 0)
    critical_prob = prob_dict.get('CRITICAL', 0)

    risk_score = round((warning_prob * 50) + (critical_prob * 100), 1)
    risk_score = min(100, max(0, risk_score))

    if risk_score < 30:
        status = 'SAFE'
    elif risk_score < 70:
        status = 'WARNING'
    else:
        status = 'CRITICAL'

    return {
        'risk_score': risk_score,
        'status': status,
        'prediction': prediction,
        'probabilities': {
            'safe': round(safe_prob * 100, 1),
            'warning': round(warning_prob * 100, 1),
            'critical': round(critical_prob * 100, 1)
        }
    }

@app.route('/', methods=['GET'])
def home():
    return jsonify({
        'message': 'ThermalAI ML Service Running 🔥',
        'status': 'ready'
    })

@app.route('/predict', methods=['POST'])
def predict():
    try:
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

@app.route('/predict/batch', methods=['POST'])
def predict_batch():
    try:
        readings = request.get_json()
        results = []
        for reading in readings:
            result = calculate_risk_score(reading)
            results.append({
                'reactor_id': reading.get('reactor_id'),
                'risk_score': result['risk_score'],
                'status': result['status']
            })
        return jsonify({'success': True, 'results': results})

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/explain', methods=['POST'])
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

        # Temperature analysis
        if temp > 200:
            reasons.append(f"🌡️ Temperature critically high at {temp}°C — safe limit is 135°C")
            recommendations.append("Immediately reduce reaction rate")
        elif temp > 160:
            reasons.append(f"🌡️ Temperature dangerously elevated at {temp}°C")
            recommendations.append("Increase cooling flow rate")
        elif temp > 135:
            reasons.append(f"🌡️ Temperature above safe threshold at {temp}°C")
            recommendations.append("Monitor temperature closely")

        # Rate of change analysis
        if temp_roc > 5:
            reasons.append(f"⚡ Temperature accelerating rapidly — rising {round(temp_roc, 1)}°C per cycle")
            recommendations.append("Emergency cooling activation required")
        elif temp_roc > 2:
            reasons.append(f"⚡ Temperature rising faster than normal — {round(temp_roc, 1)}°C per cycle")
            recommendations.append("Reduce heat input immediately")

        # Cooling analysis
        if cooling < 0.3:
            reasons.append(f"❄️ Cooling system critically failing — only {round(cooling*100)}% efficiency")
            recommendations.append("Switch to backup cooling system")
        elif cooling < 0.5:
            reasons.append(f"❄️ Cooling efficiency dangerously low at {round(cooling*100)}%")
            recommendations.append("Inspect and repair cooling system")
        elif cooling < 0.7:
            reasons.append(f"❄️ Cooling efficiency below normal at {round(cooling*100)}%")
            recommendations.append("Check cooling system performance")

        # Pressure analysis
        if pressure > 8:
            reasons.append(f"💨 Pressure critically high at {pressure} bar — safe limit is 4.5 bar")
            recommendations.append("Open pressure relief valve immediately")
        elif pressure > 6:
            reasons.append(f"💨 Pressure elevated at {pressure} bar")
            recommendations.append("Reduce reaction rate to lower pressure")
        elif pressure > 4.5:
            reasons.append(f"💨 Pressure above safe threshold at {pressure} bar")
            recommendations.append("Monitor pressure closely")

        # Overall assessment
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
            'success': True,
            'overall': overall,
            'reasons': reasons,
            'recommendations': recommendations,
            'risk_score': risk_score
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/predict-time', methods=['POST'])
def predict_time():
    try:
        data = request.get_json()
        temp = data['temperature']
        temp_roc = data.get('temp_rate_of_change', 0)
        cooling = data['cooling_efficiency']
        risk_score = data.get('risk_score', 0)
        status = data.get('status', 'SAFE')

        # Critical threshold
        CRITICAL_TEMP = 162

        # Calculate minutes to critical
        if status == 'CRITICAL':
            minutes = 0
            message = "🔴 CRITICAL — Thermal runaway in progress!"
            urgency = "CRITICAL"

        elif status == 'WARNING' and temp_roc > 0:
            # How many degrees until critical
            degrees_remaining = CRITICAL_TEMP - temp
            
            if degrees_remaining <= 0:
                minutes = 0
                message = "🔴 CRITICAL — Thermal runaway in progress!"
                urgency = "CRITICAL"
            else:
                # Each cycle = 2 seconds, temp_roc = degrees per cycle
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
            'success': True,
            'minutes_to_critical': minutes,
            'message': message,
            'urgency': urgency,
            'current_temp': temp,
            'temp_rate_of_change': temp_roc,
            'status': status
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500
      
if __name__ == '__main__':
    print("🚀 Starting ThermalAI ML API on port 5001...")
    app.run(port=5001, debug=True)