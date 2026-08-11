import React from "react";
import { RISK_THRESHOLDS } from "../constants/reactors";

// Live sensor tile grid — the COCKPIT's key process variables with a11y meters.
function SensorTicker({ reactor }) {
  const sensors = [
    { label: "Temperature", value: `${reactor.temperature ?? "—"}°C`, num: reactor.temperature ?? 0, min: 0, max: 220, color: (reactor.temperature || 0) > RISK_THRESHOLDS.TEMP_CRITICAL ? "var(--danger)" : "var(--text)", arrow: (reactor.temp_rate_of_change || 0) > 0 ? "▲" : (reactor.temp_rate_of_change || 0) < 0 ? "▼" : "", level: (reactor.temperature || 0) > RISK_THRESHOLDS.TEMP_CRITICAL ? "critical" : "safe" },
    { label: "Pressure", value: `${reactor.pressure ?? "—"} bar`, num: reactor.pressure ?? 0, min: 0, max: 12, color: (reactor.pressure || 0) > RISK_THRESHOLDS.PRESSURE_CRITICAL ? "var(--danger)" : "var(--text)", level: (reactor.pressure || 0) > RISK_THRESHOLDS.PRESSURE_CRITICAL ? "critical" : "safe" },
    { label: "Cooling", value: `${Math.round((reactor.cooling_efficiency || 0) * 100)}%`, num: Math.round((reactor.cooling_efficiency || 0) * 100), min: 0, max: 100, color: (reactor.cooling_efficiency || 0) < 0.3 ? "var(--danger)" : "var(--text)", level: (reactor.cooling_efficiency || 0) < 0.3 ? "critical" : "safe" },
    { label: "Reaction Rate", value: reactor.reaction_rate ?? "—", num: reactor.reaction_rate ?? 0, min: 0, max: 1, color: "var(--text)", level: (reactor.reaction_rate || 0) >= 0.7 ? "critical" : "safe" },
    { label: "ΔTemp/Cycle", value: `${reactor.temp_rate_of_change ?? 0}°C`, num: reactor.temp_rate_of_change ?? 0, min: -20, max: 20, color: (reactor.temp_rate_of_change || 0) > 5 ? "var(--danger)" : "var(--text)", level: (reactor.temp_rate_of_change || 0) > 5 ? "critical" : "safe" },
    { label: "Risk", value: `${reactor.risk_score ?? 0}%`, num: reactor.risk_score ?? 0, min: 0, max: 100, color: (reactor.risk_score || 0) >= RISK_THRESHOLDS.CRITICAL ? "var(--danger)" : (reactor.risk_score || 0) >= RISK_THRESHOLDS.WARNING ? "var(--warning)" : "var(--success)", level: (reactor.risk_score || 0) >= RISK_THRESHOLDS.CRITICAL ? "critical" : (reactor.risk_score || 0) >= RISK_THRESHOLDS.WARNING ? "warning" : "safe" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {sensors.map((s) => (
        <div
          key={s.label}
          role="meter"
          aria-label={`${s.label}: ${s.value}`}
          aria-valuenow={s.num}
          aria-valuemin={s.min}
          aria-valuemax={s.max}
          title={`${s.label}: ${s.value} — ${s.level}`}
          className="p-3"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 10 }}
        >
          <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
            {s.label}
          </p>
          <p className="text-lg font-bold mt-1 tabular-nums" style={{ color: s.color }}>
            {s.value} {s.arrow && <span className="text-xs" aria-hidden="true">{s.arrow}</span>}
          </p>
        </div>
      ))}
    </div>
  );
}

export default SensorTicker;
