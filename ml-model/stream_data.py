import os
import sys
import time
import random
import requests
from datetime import datetime

# Windows cp1252 console crashes on emoji in print() — force UTF-8 output.
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')
except (AttributeError, ValueError):
    pass

# Backend API URL
BACKEND_URL = os.environ.get('BACKEND_URL', 'http://localhost:5000')
API_URL = f"{BACKEND_URL}/api/reactors/stream"
LOGIN_URL = f"{BACKEND_URL}/api/auth/login"

# Auth — simulator must log in like any other client (route is JWT-protected).
SIM_USER = os.environ.get('SIM_USER', 'operator')
SIM_PASS = os.environ.get('SIM_PASS', 'op123')


def get_auth_token():
    """POST /api/auth/login and return the JWT."""
    try:
        r = requests.post(LOGIN_URL, json={'username': SIM_USER, 'password': SIM_PASS}, timeout=10)
        if r.status_code != 200:
            print(f"❌ Simulator login failed ({r.status_code}): {r.text}")
            print(f"   Set SIM_USER / SIM_PASS env vars or seed the demo users.")
            sys.exit(1)
        return r.json()['token']
    except requests.exceptions.RequestException as e:
        print(f"❌ Cannot reach backend at {LOGIN_URL}: {e}")
        sys.exit(1)


AUTH_TOKEN = get_auth_token()
AUTH_HEADERS = {'Authorization': f'Bearer {AUTH_TOKEN}'}
print(f"🔑 Simulator authenticated as {SIM_USER}")

reactors = ['A', 'B', 'C', 'D', 'E']

# Initial state of each reactor
reactor_states = {
    'A': {'temp': 115, 'pressure': 3.8, 'cooling': 0.92, 'state': 'SAFE'},
    'B': {'temp': 148, 'pressure': 5.2, 'cooling': 0.65, 'state': 'WARNING'},
    'C': {'temp': 168, 'pressure': 6.8, 'cooling': 0.35, 'state': 'CRITICAL'},
    'D': {'temp': 120, 'pressure': 4.1, 'cooling': 0.91, 'state': 'SAFE'},
    'E': {'temp': 155, 'pressure': 5.8, 'cooling': 0.55, 'state': 'WARNING'},
}


def update_reactor(reactor_id):
    state = reactor_states[reactor_id]

    # SAFE STATE
    if state['state'] == 'SAFE':
        state['temp'] += random.uniform(-0.5, 0.8)
        state['pressure'] += random.uniform(-0.05, 0.08)
        state['cooling'] += random.uniform(-0.01, 0.01)

        state['cooling'] = min(0.97, max(0.80, state['cooling']))

        if state['temp'] > 135:
            state['state'] = 'WARNING'

    # WARNING STATE
    elif state['state'] == 'WARNING':
        state['temp'] += random.uniform(0.5, 2.0)
        state['pressure'] += random.uniform(0.05, 0.2)
        state['cooling'] -= random.uniform(0.005, 0.01)

        state['cooling'] = max(0.50, state['cooling'])

        if state['temp'] > 162:
            state['state'] = 'CRITICAL'

        elif state['temp'] < 130:
            state['state'] = 'SAFE'

    # CRITICAL STATE
    elif state['state'] == 'CRITICAL':
        state['temp'] += random.uniform(2.0, 5.0)
        state['pressure'] += random.uniform(0.2, 0.5)
        state['cooling'] -= random.uniform(0.01, 0.02)

        state['cooling'] = max(0.10, state['cooling'])

        # Reset for demo
        if state['temp'] > 400:
            print(f"🔥 Reactor {reactor_id} RESETTING TO SAFE")

            state['temp'] = 115
            state['pressure'] = 3.8
            state['cooling'] = 0.92
            state['state'] = 'SAFE'

    reading = {
        "reactor_id": reactor_id,
        "temperature": round(state['temp'], 2),
        "pressure": round(state['pressure'], 2),
        "reaction_rate": round(random.uniform(0.4, 1.0), 2),
        "cooling_efficiency": round(state['cooling'], 2),
        "temp_rate_of_change": round(state['temp'] - 115, 3),
        "label": state['state'],
        "timestamp": datetime.now().isoformat()
    }

    return reading


print("\n🚀 Starting ThermalAI Live Reactor Stream")
print("📡 Sending data to:", API_URL)
print("🛑 Press CTRL + C to stop\n")

cycle = 0

while True:
    cycle += 1

    print(f"\n================ CYCLE {cycle} ================\n")

    for reactor_id in reactors:

        reading = update_reactor(reactor_id)

        print(
            f"⚛️ Reactor {reactor_id} | "
            f"{reading['label']} | "
            f"Temp: {reading['temperature']}°C | "
            f"Pressure: {reading['pressure']} bar"
        )

        try:
            response = requests.post(
                API_URL,
                json=reading,
                headers=AUTH_HEADERS,
                timeout=5
            )

            print(
                f"✅ Sent to backend | "
                f"Status: {response.status_code}"
            )

            if response.text:
                print("📨 Response:", response.text)

        except requests.exceptions.ConnectionError:
            print("❌ Connection Error: Backend not running on port 5000")

        except requests.exceptions.Timeout:
            print("⏰ Request Timeout")

        except Exception as e:
            print("🔥 Error:", str(e))

    time.sleep(2)