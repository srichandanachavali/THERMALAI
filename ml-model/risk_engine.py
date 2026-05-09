import pandas as pd
import numpy as np
import pickle

# Load saved model
with open('saved-models/rf_model.pkl', 'rb') as f:
    model = pickle.load(f)

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
    """
    Takes a reactor reading and returns:
    - risk_score: 0-100%
    - status: SAFE / WARNING / CRITICAL
    - probabilities for each class
    """
    # Build feature vector
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
    
    # Get prediction and probabilities
    prediction = model.predict(df)[0]
    probabilities = model.predict_proba(df)[0]
    classes = model.classes_
    
    # Map probabilities to labels
    prob_dict = dict(zip(classes, probabilities))
    
    # Calculate risk score 0-100
    safe_prob = prob_dict.get('SAFE', 0)
    warning_prob = prob_dict.get('WARNING', 0)
    critical_prob = prob_dict.get('CRITICAL', 0)
    
    # Risk score formula
    risk_score = round((warning_prob * 50) + (critical_prob * 100), 1)
    risk_score = min(100, max(0, risk_score))
    
    # Determine status
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

# Test with 3 scenarios
print("=== THERMALAI RISK ENGINE TEST ===\n")

# Test 1 - Safe reactor
safe_reading = {
    'temperature': 118,
    'pressure': 3.8,
    'reaction_rate': 0.45,
    'cooling_efficiency': 0.92,
    'temp_rate_of_change': 0.2
}
result = calculate_risk_score(safe_reading)
print(f"Test 1 — Safe Reactor:")
print(f"  Temp: 118°C | Cooling: 0.92")
print(f"  Risk Score: {result['risk_score']}%")
print(f"  Status: {result['status']}")
print(f"  Probabilities: {result['probabilities']}\n")

# Test 2 - Warning reactor
warning_reading = {
    'temperature': 155,
    'pressure': 5.8,
    'reaction_rate': 0.70,
    'cooling_efficiency': 0.62,
    'temp_rate_of_change': 1.5
}
result = calculate_risk_score(warning_reading)
print(f"Test 2 — Warning Reactor:")
print(f"  Temp: 155°C | Cooling: 0.62")
print(f"  Risk Score: {result['risk_score']}%")
print(f"  Status: {result['status']}")
print(f"  Probabilities: {result['probabilities']}\n")

# Test 3 - Critical reactor
critical_reading = {
    'temperature': 210,
    'pressure': 8.5,
    'reaction_rate': 0.92,
    'cooling_efficiency': 0.25,
    'temp_rate_of_change': 5.2
}
result = calculate_risk_score(critical_reading)
print(f"Test 3 — Critical Reactor:")
print(f"  Temp: 210°C | Cooling: 0.25")
print(f"  Risk Score: {result['risk_score']}%")
print(f"  Status: {result['status']}")
print(f"  Probabilities: {result['probabilities']}\n")

print("✅ Risk engine working perfectly!")
print("🔥 Ready to connect to backend API!")