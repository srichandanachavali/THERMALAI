import os
import sys
import time
import requests
from datetime import datetime
from kinetics import REACTOR_CONFIG, init_reactor, step

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
            print(f"[ThermalAI] Simulator login failed ({r.status_code}): {r.text}")
            print("   Set SIM_USER / SIM_PASS env vars or seed the demo users.")
            sys.exit(1)
        return r.json()['token']
    except requests.exceptions.RequestException as e:
        print(f"[ThermalAI] Cannot reach backend at {LOGIN_URL}: {e}")
        sys.exit(1)


AUTH_TOKEN = get_auth_token()
AUTH_HEADERS = {'Authorization': f'Bearer {AUTH_TOKEN}'}
print(f"[ThermalAI] Simulator authenticated as {SIM_USER}")

reactors = ['R-101', 'R-102', 'R-201', 'R-202', 'R-301']
states = {rid: init_reactor(rid) for rid in reactors}

STATE_PAD = max(len(s) for s in ('NOMINAL', 'DEGRADING', 'WARNING', 'CRITICAL', 'RECOVERY'))
SHORT_PAD = max(len(REACTOR_CONFIG[r]['short']) for r in reactors)

print(f"[ThermalAI] Starting physics-driven live reactor stream ({len(reactors)} reactors)")
print(f"[ThermalAI] Sending data to: {API_URL}")
print("[ThermalAI] Press CTRL+C to stop")

cycle = 0

while True:
    cycle += 1
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    print(f"\n[ThermalAI Stream] Cycle {cycle} | {now}")

    for rid in reactors:
        cfg = REACTOR_CONFIG[rid]
        reading = step(rid, states[rid])
        reading['timestamp'] = datetime.now().isoformat()

        line = (
            f"{cfg['tag']} {cfg['short'].ljust(SHORT_PAD)} | "
            f"{reading['state'].ljust(STATE_PAD)} | "
            f"T:{reading['temperature']:6.1f}C P:{reading['pressure']:4.1f}bar "
            f"Gas:{reading['gas_concentration']:5.1f}ppm pH:{reading['ph_level']:.1f}"
        )
        if reading['state'] != 'NOMINAL':
            line += f" Flow:{reading['flow_rate']:.0f}L/min"
        if reading['fault_active']:
            line += f" [FAULT:{reading['fault_active']}]"
        print(line)

        try:
            response = requests.post(API_URL, json=reading, headers=AUTH_HEADERS, timeout=5)
            if response.status_code != 200:
                print(f"  -> HTTP {response.status_code}: {response.text[:120]}")
        except requests.exceptions.ConnectionError:
            print("  -> Connection Error: backend not running on port 5000")
        except requests.exceptions.Timeout:
            print("  -> Request Timeout")
        except Exception as e:
            print(f"  -> Error: {e}")

    time.sleep(2)
