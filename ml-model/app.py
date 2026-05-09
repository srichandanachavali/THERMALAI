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

if __name__ == '__main__':
    print("🚀 Starting ThermalAI ML API on port 5001...")
    app.run(port=5001, debug=True)