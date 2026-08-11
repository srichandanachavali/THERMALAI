import React from "react";
import { FiAlertTriangle } from "react-icons/fi";
import { RISK_THRESHOLDS } from "../constants/reactors";

// ASM HMI sensor-progress-bar class: grey for normal, amber elevated, red critical.
export function sensorBarClass(value, warnThreshold, critThreshold) {
  if (value >= critThreshold) return "sensor-bar-critical";
  if (value >= warnThreshold) return "sensor-bar-warning";
  return "sensor-bar-normal";
}

// Primary IEC 61511 sensor rows shown on the reactor card.
export function sensorRows(r) {
  const rate = r.reaction_rate || 0;
  const tempVal = Math.min(100, (r.temperature / 200) * 100);
  const pressureVal = Math.min(100, (r.pressure / 10) * 100);
  const rateVal = Math.min(100, rate * 100);
  const coolingVal = Math.min(100, r.cooling_efficiency * 100);
  return [
    { label: "Temperature", value: tempVal, barClass: sensorBarClass(r.temperature, RISK_THRESHOLDS.TEMP_WARNING, RISK_THRESHOLDS.TEMP_CRITICAL), display: `${r.temperature}°C`, color: r.temperature > RISK_THRESHOLDS.TEMP_CRITICAL ? "var(--danger)" : "var(--accent)" },
    { label: "Pressure", value: pressureVal, barClass: sensorBarClass(r.pressure, RISK_THRESHOLDS.PRESSURE_WARNING, RISK_THRESHOLDS.PRESSURE_CRITICAL), display: `${r.pressure} bar`, color: r.pressure > RISK_THRESHOLDS.PRESSURE_CRITICAL ? "var(--danger)" : "var(--accent-light)" },
    { label: "Reaction Rate", value: rateVal, barClass: sensorBarClass(rate, 0.4, 0.7), display: `${Math.round(rate * 100)}%`, color: rate >= 0.7 ? "var(--danger)" : rate >= 0.4 ? "var(--warning)" : "var(--success)" },
    { label: "Cooling", value: coolingVal, barClass: sensorBarClass(1 - r.cooling_efficiency, 0.5, 0.7), display: `${Math.round(r.cooling_efficiency * 100)}%`, color: r.cooling_efficiency < 0.3 ? "var(--danger)" : "var(--success)" },
  ];
}

// Extended IEC 61511 sensor rows (flow, level, gas, pH, CO2).
export function extendedRows(r) {
  const flow = r.flow_rate ?? 150;
  const level = r.material_level ?? 75;
  const gas = r.gas_concentration ?? 0;
  const ph = r.ph_level ?? 7;
  const co2 = r.emissions_co2_ppm ?? 400;
  return [
    {
      label: "Flow Rate", display: `${flow} L/min`, value: Math.min(100, (flow / 500) * 100),
      color: flow < 10 || flow > 480 ? "var(--danger)" : "var(--success)",
      barClass: flow < 10 || flow > 480 ? "sensor-bar-critical" : "sensor-bar-normal",
    },
    {
      label: "Material Level", display: `${level}%`, value: Math.min(100, level),
      color: level < 5 || level > 95 ? "var(--danger)" : level < 20 ? "var(--warning)" : "var(--success)",
      barClass: level < 5 || level > 95 ? "sensor-bar-critical" : level < 20 ? "sensor-bar-warning" : "sensor-bar-normal",
    },
    {
      label: "Gas", display: `${gas} ppm`, value: Math.min(100, (gas / 1000) * 100),
      color: gas < RISK_THRESHOLDS.GAS_TOXIC ? "var(--success)" : gas <= RISK_THRESHOLDS.GAS_ABORT ? "var(--warning)" : "var(--danger)",
      pulse: gas > RISK_THRESHOLDS.GAS_ABORT,
      warn: gas > RISK_THRESHOLDS.GAS_TOXIC,
      barClass: gas < RISK_THRESHOLDS.GAS_TOXIC ? "sensor-bar-normal" : gas <= RISK_THRESHOLDS.GAS_ABORT ? "sensor-bar-warning" : "sensor-bar-critical",
    },
    {
      label: "pH Level", display: `${ph}`, value: Math.min(100, (ph / 14) * 100),
      color: ph < RISK_THRESHOLDS.PH_LOW_DANGER || ph > RISK_THRESHOLDS.PH_HIGH_DANGER ? "var(--danger)" : ph < RISK_THRESHOLDS.PH_LOW_WARNING || ph > RISK_THRESHOLDS.PH_HIGH_WARNING ? "var(--warning)" : "var(--success)",
      barClass: ph < RISK_THRESHOLDS.PH_LOW_DANGER || ph > RISK_THRESHOLDS.PH_HIGH_DANGER ? "sensor-bar-critical" : ph < RISK_THRESHOLDS.PH_LOW_WARNING || ph > RISK_THRESHOLDS.PH_HIGH_WARNING ? "sensor-bar-warning" : "sensor-bar-normal",
    },
    {
      label: "CO₂", display: `${co2} ppm`, value: Math.min(100, (co2 / 5000) * 100),
      color: co2 > RISK_THRESHOLDS.CO2_CRITICAL ? "var(--danger)" : co2 > RISK_THRESHOLDS.CO2_WARNING ? "var(--warning)" : "var(--success)",
      barClass: co2 > RISK_THRESHOLDS.CO2_CRITICAL ? "sensor-bar-critical" : co2 > RISK_THRESHOLDS.CO2_WARNING ? "sensor-bar-warning" : "sensor-bar-normal",
    },
  ];
}

// One sensor as a labeled progress bar (role=meter for a11y).
export function SensorRow({ s }) {
  const barClass = s.barClass || (s.color === "var(--danger)" ? "sensor-bar-critical" : s.color === "var(--warning)" ? "sensor-bar-warning" : "sensor-bar-normal");

  return (
    <div
      key={s.label}
      role="meter"
      aria-label={`${s.label}: ${s.display}`}
      aria-valuenow={Math.round(s.value)}
      aria-valuemin={0}
      aria-valuemax={100}
      title={`${s.label}: ${s.display}${s.warn ? " — warning" : ""}`}
    >
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: "var(--text-sub)" }}>
          {s.label}
          {s.warn && (
            <span className="ml-1" style={{ color: "var(--danger)" }} aria-label="warning">
              <FiAlertTriangle size={10} />
            </span>
          )}
        </span>
        <span style={{ color: "var(--text)" }}>{s.display}</span>
      </div>
      <div className="sensor-bar-track" aria-hidden="true">
        <div
          className={`sensor-bar-fill ${barClass}`}
          style={{
            width: `${s.value}%`,
            transition: "width 0.4s ease",
            animation: s.pulse ? "thermalai-pulse 1s infinite" : "none",
          }}
        />
      </div>
    </div>
  );
}

// Circular risk gauge used on the reactor card. Forces red if any IEC 61511
// parameter is CRITICAL regardless of score.
export function ReactorGauge({ score, status, reactor }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const riskColor =
    status === "SAFE"
      ? "var(--success)"
      : status === "WARNING"
        ? "var(--warning)"
        : "var(--danger)";
  const hasCritical = (reactor.parameter_alerts || []).some(
    (p) => p.severity === "CRITICAL",
  );
  const gaugeColor = hasCritical ? "var(--danger)" : riskColor;

  return (
    <div className="relative w-28 h-28 mx-auto">
      <svg width="112" height="112" className="transform -rotate-90">
        <circle
          cx="56" cy="56" r={radius} fill="none"
          stroke="var(--border)" strokeWidth="9"
        />
        <circle
          cx="56" cy="56" r={radius} fill="none"
          stroke={gaugeColor} strokeWidth="9"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold" style={{ color: "var(--text)" }}>
          {score}%
        </span>
        <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
          Risk
        </span>
      </div>
    </div>
  );
}
