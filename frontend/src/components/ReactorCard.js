import React from "react";
import { FiAlertTriangle } from "react-icons/fi";
import StatusBadge from "./StatusBadge";
import { getReactorConfig, RISK_THRESHOLDS } from "../constants/reactors";

// Compact reactor card for the Home grid: risk gauge + sensor progress rows.
// `critical`/`degrading` enable Level-1 pinning treatments (red pulsing border +
// IMMEDIATE ACTION banner, and amber degrading border respectively).
function ReactorCard({ reactor, onClick, critical, degrading }) {
  const config = getReactorConfig(reactor.reactor_id);
  const isCritical = critical ?? reactor.status === "CRITICAL";
  const isDegrading = degrading ?? reactor.status === "DEGRADING";
  const riskColor = (status) =>
    status === "SAFE"
      ? "var(--success)"
      : status === "WARNING"
        ? "var(--warning)"
        : "var(--danger)";

  // Gauge forces red if any IEC 61511 parameter is CRITICAL, regardless of score.
  const gaugeColor = (status) => {
    const hasCritical = (reactor.parameter_alerts || []).some(
      (p) => p.severity === "CRITICAL",
    );
    return hasCritical ? "var(--danger)" : riskColor(status);
  };

  const sensorRows = (r) => {
    const rate = r.reaction_rate || 0;
    return [
      { label: "Temperature", value: Math.min(100, (r.temperature / 200) * 100), display: `${r.temperature}°C`, color: r.temperature > RISK_THRESHOLDS.TEMP_CRITICAL ? "var(--danger)" : "var(--accent)" },
      { label: "Pressure", value: Math.min(100, (r.pressure / 10) * 100), display: `${r.pressure} bar`, color: r.pressure > RISK_THRESHOLDS.PRESSURE_CRITICAL ? "var(--danger)" : "var(--accentLight)" },
      { label: "Reaction Rate", value: Math.min(100, rate * 100), display: `${Math.round(rate * 100)}%`, color: rate >= 0.7 ? "var(--danger)" : rate >= 0.4 ? "var(--warning)" : "var(--success)" },
      { label: "Cooling", value: Math.min(100, r.cooling_efficiency * 100), display: `${Math.round(r.cooling_efficiency * 100)}%`, color: r.cooling_efficiency < 0.3 ? "var(--danger)" : "var(--success)" },
    ];
  };

  // IEC 61511 extended sensors
  const extendedRows = (r) => {
    const flow = r.flow_rate ?? 150;
    const level = r.material_level ?? 75;
    const gas = r.gas_concentration ?? 0;
    const ph = r.ph_level ?? 7;
    const co2 = r.emissions_co2_ppm ?? 400;
    return [
      {
        label: "Flow Rate", display: `${flow} L/min`, value: Math.min(100, (flow / 500) * 100),
        color: flow < 10 || flow > 480 ? "var(--danger)" : "var(--success)",
      },
      {
        label: "Material Level", display: `${level}%`, value: Math.min(100, level),
        color: level < 5 || level > 95 ? "var(--danger)" : level < 20 ? "var(--warning)" : "var(--success)",
      },
      {
        label: "Gas", display: `${gas} ppm`, value: Math.min(100, (gas / 1000) * 100),
        color: gas < RISK_THRESHOLDS.GAS_TOXIC ? "var(--success)" : gas <= RISK_THRESHOLDS.GAS_ABORT ? "var(--warning)" : "var(--danger)",
        pulse: gas > RISK_THRESHOLDS.GAS_ABORT,
        warn: gas > RISK_THRESHOLDS.GAS_TOXIC,
      },
      {
        label: "pH Level", display: `${ph}`, value: Math.min(100, (ph / 14) * 100),
        color: ph < RISK_THRESHOLDS.PH_LOW_DANGER || ph > RISK_THRESHOLDS.PH_HIGH_DANGER ? "var(--danger)" : ph < RISK_THRESHOLDS.PH_LOW_WARNING || ph > RISK_THRESHOLDS.PH_HIGH_WARNING ? "var(--warning)" : "var(--success)",
      },
      {
        label: "CO₂", display: `${co2} ppm`, value: Math.min(100, (co2 / 5000) * 100),
        color: co2 > RISK_THRESHOLDS.CO2_CRITICAL ? "var(--danger)" : co2 > RISK_THRESHOLDS.CO2_WARNING ? "var(--warning)" : "var(--success)",
      },
    ];
  };

  const gasAlert = (reactor.gas_concentration ?? 0) > RISK_THRESHOLDS.GAS_TOXIC;

  const RiskGauge = ({ score, status }) => {
    const radius = 42;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    return (
      <div className="relative w-28 h-28 mx-auto">
        <svg width="112" height="112" className="transform -rotate-90">
          <circle
            cx="56" cy="56" r={radius} fill="none"
            stroke="var(--border)" strokeWidth="9"
          />
          <circle
            cx="56" cy="56" r={radius} fill="none"
            stroke={gaugeColor(status)} strokeWidth="9"
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
          <span className="text-[10px]" style={{ color: "var(--textMuted)" }}>
            Risk
          </span>
        </div>
      </div>
    );
  };

  const SensorRow = ({ s }) => (
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
        <span style={{ color: "var(--textSub)" }}>
          {s.label}
          {s.warn && (
            <span className="ml-1" style={{ color: "var(--danger)" }} aria-label="warning">
              <FiAlertTriangle size={10} />
            </span>
          )}
        </span>
        <span style={{ color: "var(--text)" }}>{s.display}</span>
      </div>
      <div
        className="h-1 rounded-full"
        style={{ backgroundColor: "var(--border)" }}
        aria-hidden="true"
      >
        <div
          className="h-1 rounded-full"
          style={{
            width: `${s.value}%`,
            backgroundColor: s.color,
            transition: "width 0.4s ease",
            animation: s.pulse ? "thermalai-pulse 1s infinite" : "none",
          }}
        />
      </div>
    </div>
  );

  return (
    <div
      onClick={onClick}
      tabIndex={0}
      role="button"
      aria-label={`${config.tag} ${config.name}, status ${isCritical ? "CRITICAL" : isDegrading ? "DEGRADING" : reactor.status}, risk ${reactor.risk_score}%. Open reactor detail.`}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className="p-5 cursor-pointer transition-colors relative"
      style={{
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        boxShadow: isCritical
          ? "-4px 0 0 #ef4444"
          : isDegrading
            ? "-4px 0 0 #d97706"
            : "none",
        animation: isCritical ? "thermalai-critical-pulse 1.5s ease-in-out infinite" : "none",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
    >
      {isCritical && (
        <div
          className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-center px-2 py-1 rounded-md mb-3 tracking-wide"
          style={{ backgroundColor: "#ef4444", color: "#fff", animation: "thermalai-pulse 1s infinite" }}
        >
          <FiAlertTriangle size={12} aria-hidden="true" />
          <span>CRITICAL — IMMEDIATE ACTION REQUIRED</span>
        </div>
      )}
      {isDegrading && (
        <div
          className="flex items-center justify-center gap-1.5 text-[11px] font-bold text-center px-2 py-1 rounded-md mb-3 tracking-wide"
          style={{ backgroundColor: "#d97706", color: "#fff" }}
        >
          <FiAlertTriangle size={12} aria-hidden="true" />
          <span>DEGRADING</span>
        </div>
      )}
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold" style={{ color: "var(--text)" }}>
          {config.tag}
        </span>
        <div className="flex items-center gap-2">
          {gasAlert && (
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: "var(--danger)", color: "#fff", animation: "thermalai-pulse 1s infinite" }}
            >
              GAS ALERT
            </span>
          )}
          <StatusBadge status={reactor.status} />
        </div>
      </div>
      <RiskGauge score={reactor.risk_score} status={reactor.status} />
      <div className="space-y-2.5 mt-4">
        {sensorRows(reactor).map((s) => (
          <SensorRow key={s.label} s={s} />
        ))}
      </div>
      {/* Extended sensors section */}
      <div
        className="mt-4 pt-3"
        style={{ borderTop: "1px solid var(--border)" }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--textMuted)" }}>
          Extended Sensors
        </p>
        <div className="space-y-2.5">
          {extendedRows(reactor).map((s) => (
            <SensorRow key={s.label} s={s} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default ReactorCard;
