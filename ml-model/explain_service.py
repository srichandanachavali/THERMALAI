"""
explain_service.py — Heuristic reason/recommendation builder for the /explain route.

Pure function with no Flask/model dependencies, so it stays unit-testable and
keeps routes_risk.py under the repo's file-size guardrail.
"""


def build_explanation(
    temp,
    pressure,
    cooling,
    temp_roc,
    risk_score,
    flow_rate=150.0,
    material_level=75.0,
    gas_concentration=0.0,
    ph_level=7.0,
    emissions_co2_ppm=400.0,
):
    """Return (reasons, recommendations, overall) from current multi-sensor readings."""
    reasons = []
    recommendations = []

    # Float casting safety
    temp = float(temp or 0.0)
    pressure = float(pressure or 0.0)
    cooling = float(cooling or 1.0)
    temp_roc = float(temp_roc or 0.0)
    risk_score = float(risk_score or 0.0)
    flow_rate = float(flow_rate or 150.0)
    material_level = float(material_level or 75.0)
    gas_concentration = float(gas_concentration or 0.0)
    ph_level = float(ph_level or 7.0)
    emissions_co2_ppm = float(emissions_co2_ppm or 400.0)

    # 1. Temperature rules
    if temp > 200:
        reasons.append(
            f"🌡️ Temperature critically high at {temp:.1f}°C — safe limit is 135°C"
        )
        recommendations.append("Immediately reduce reaction rate / dump feed")
    elif temp > 160:
        reasons.append(
            f"🌡️ Temperature dangerously elevated at {temp:.1f}°C"
        )
        recommendations.append("Increase cooling flow rate to maximum")
    elif temp > 135:
        reasons.append(
            f"🌡️ Temperature above safe threshold at {temp:.1f}°C"
        )
        recommendations.append("Monitor temperature closely")

    # 2. Temperature Rate of Change rules
    if temp_roc > 5:
        reasons.append(
            f"⚡ Temperature accelerating rapidly — rising {round(temp_roc, 1)}°C per cycle"
        )
        recommendations.append("Emergency cooling activation required")
    elif temp_roc > 2:
        reasons.append(
            f"⚡ Temperature rising faster than normal — {round(temp_roc, 1)}°C per cycle"
        )
        recommendations.append("Reduce heat input immediately")

    # 3. Cooling system rules
    if cooling < 0.3:
        reasons.append(
            f"❄️ Cooling system critically failing — only {round(cooling * 100)}% efficiency"
        )
        recommendations.append("Switch to backup cooling loop immediately")
    elif cooling < 0.5:
        reasons.append(
            f"❄️ Cooling efficiency dangerously low at {round(cooling * 100)}%"
        )
        recommendations.append("Inspect and service cooling jacket valves")
    elif cooling < 0.7:
        reasons.append(
            f"❄️ Cooling efficiency below normal at {round(cooling * 100)}%"
        )
        recommendations.append("Check cooling utility supply pressure")

    # 4. Vessel Pressure rules
    if pressure > 8.0:
        reasons.append(
            f"💨 Pressure critically high at {pressure:.1f} bar — safe limit is 4.5 bar"
        )
        recommendations.append("Open emergency pressure relief valve immediately")
    elif pressure > 6.0:
        reasons.append(
            f"💨 Pressure elevated at {pressure:.1f} bar"
        )
        recommendations.append("Reduce reaction rate to lower vapor generation")
    elif pressure > 4.5:
        reasons.append(
            f"💨 Pressure above safe threshold at {pressure:.1f} bar"
        )
        recommendations.append("Monitor vessel pressure trend closely")

    # 5. Extended Sensor Rules (IEC 61511)
    if gas_concentration >= 500:
        reasons.append(
            f"☣️ Headspace off-gas critically high ({gas_concentration:.0f} ppm) — above abort limit"
        )
        recommendations.append("Trigger automated nitrogen purge and vent scrubber sequence")
    elif gas_concentration >= 25:
        reasons.append(
            f"☣️ Toxic gas detected ({gas_concentration:.0f} ppm) — above safe threshold"
        )
        recommendations.append("Inspect vessel seal integrity and vent line")

    if ph_level < 4.0:
        reasons.append(
            f"🧪 Runaway acidification — pH dropped to {ph_level:.1f}"
        )
        recommendations.append("Inject neutralizer / base buffer solution immediately")
    elif ph_level > 10.0:
        reasons.append(
            f"🧪 Alkaline spike — pH elevated at {ph_level:.1f}"
        )
        recommendations.append("Adjust acid stoichiometry / inspect feed dosing pump")

    if emissions_co2_ppm > 4000:
        reasons.append(
            f"☁️ Stack CO₂ effluent critically high ({emissions_co2_ppm:.0f} ppm)"
        )
        recommendations.append("Check environmental scrubber and vent catalytic converter")
    elif emissions_co2_ppm > 2500:
        reasons.append(
            f"☁️ Stack CO₂ effluent elevated ({emissions_co2_ppm:.0f} ppm)"
        )
        recommendations.append("Verify vent scrubber operation")

    if flow_rate < 10:
        reasons.append(f"💧 Feed/Coolant flow rate critically restricted ({flow_rate:.0f} L/min)")
        recommendations.append("Inspect feed pumps and inlet control valves")

    if material_level < 5:
        reasons.append(f"🪹 Material inventory near empty ({material_level:.0f}%) — agitator dry-run risk")
        recommendations.append("Halt agitator to avoid mechanical vibration")
    elif material_level > 95:
        reasons.append(f"🛢️ Vessel level near full ({material_level:.0f}%) — overflow risk")
        recommendations.append("Throttle inlet feed valve")

    # 6. Overall Status Assessment
    if risk_score >= 70:
        overall = "IMMEDIATE ACTION REQUIRED — Thermal runaway or severe parameter breach imminent"
    elif risk_score >= 30:
        overall = "CAUTION — Reactor showing signs of process instability or boundary warning"
    else:
        overall = "Reactor operating within safe parameters"

    # Default fallback
    if not reasons:
        reasons.append("✅ All parameters within safe operating range")
        recommendations.append("Continue normal steady-state operations")

    return reasons, recommendations, overall