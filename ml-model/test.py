import requests

try:
    r = requests.post(
        "http://localhost:5000/api/auth/login",
        json={"username": "operator", "password": "op123"},
        timeout=5
    )

    print("Status:", r.status_code)
    print(r.text)

except Exception as e:
    print(e)