"""Heuristic reason/recommendation builder for the /explain route.

Pure function with no Flask/model dependencies, so it stays unit-testable and
keeps routes_risk.py under the repo's file-size guardrail.
"""


def build_explanation(temp, pressure, cooling, temp_roc, risk_score):
    """Return (reasons, recommendations, overall) from current sensor readings."""
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
    return reasons, recommendations, overall
