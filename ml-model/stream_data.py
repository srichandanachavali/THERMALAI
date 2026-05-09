import time
import random
import requests
from datetime import datetime

# Backend API URL
API_URL = "http://localhost:5000/api/stream"

reactors = ['A', 'B', 'C', 'D', 'E']

# Current state of each reactor
reactor_states = {
    'A': {'temp': 115, 'pressure': 3.8, 'cooling': 0.92, 'state': 'SAFE'},
    'B': {'temp': 118, 'pressure': 4.0, 'cooling': 0.89, 'state': 'SAFE'},
    'C': {'temp': 112, 'pressure': 3.6, 'cooling': 0.94, 'state': 'SAFE'},
    'D': {'temp': 120, 'pressure': 4.1, 'cooling': 0.91, 'state': 'SAFE'},
    'E': {'temp': 116, 'pressure': 3.9, 'cooling': 0.90, 'state': 'SAFE'},
}

def update_reactor(reactor_id):
    state = reactor_states[reactor_id]
    
    if state['state'] == 'SAFE':
        state['temp'] += random.uniform(-0.5, 0.8)
        state['pressure'] += random.uniform(-0.05, 0.08)
        state['cooling'] += random.uniform(-0.01, 0.01)
        state['cooling'] = min(0.97, max(0.80, state['cooling']))
        
        if state['temp'] > 135:
            state['state'] = 'WARNING'
            
    elif state['state'] == 'WARNING':
        state['temp'] += random.uniform(0.5, 2.0)
        state['pressure'] += random.uniform(0.05, 0.2)
        state['cooling'] -= random.uniform(0.005, 0.01)
        state['cooling'] = max(0.50, state['cooling'])
        
        if state['temp'] > 162:
            state['state'] = 'CRITICAL'
        elif state['temp'] < 130:
            state['state'] = 'SAFE'
            
    elif state['state'] == 'CRITICAL':
        state['temp'] += random.uniform(2.0, 5.0)
        state['pressure'] += random.uniform(0.2, 0.5)
        state['cooling'] -= random.uniform(0.01, 0.02)
        state['cooling'] = max(0.10, state['cooling'])
        
        # Reset after extreme temp for demo purposes
        if state['temp'] > 400:
            state['temp'] = 115
            state['pressure'] = 3.8
            state['cooling'] = 0.92
            state['state'] = 'SAFE'

    reading = {
        'reactor_id': reactor_id,
        'temperature': round(state['temp'], 2),
        'pressure': round(state['pressure'], 2),
        'reaction_rate': round(random.uniform(0.4, 1.0), 2),
        'cooling_efficiency': round(state['cooling'], 2),
        'temp_rate_of_change': round(state['temp'] - 115, 3),
        'label': state['state'],
        'timestamp': datetime.now().isoformat()
    }
    return reading

print("🚀 Starting live reactor data stream...")
print("Streaming to:", API_URL)
print("Press Ctrl+C to stop\n")

cycle = 0
while True:
    cycle += 1
    print(f"--- Cycle {cycle} ---")
    
    for reactor_id in reactors:
        reading = update_reactor(reactor_id)
        print(f"Reactor {reactor_id}: {reading['label']} | Temp: {reading['temperature']}°C | Pressure: {reading['pressure']} bar")
        
        try:
            requests.post(API_URL, json=reading, timeout=2)
        except:
            pass  # Backend not ready yet — that's ok
    
    print()
    time.sleep(2)