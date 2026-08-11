import React from "react";
import { RISK_THRESHOLDS } from "../constants/reactors";

const T = RISK_THRESHOLDS;

// Live sensor tile grid — cockpits key process variables with a11y meters.
function SensorTicker({ reactor = {} }) {
  if (!reactor) return null;

  const temp = reactor.temperature ?? 0;
  const press = reactor.pressure ?? 0;
  const cooling = reactor.cooling_efficiency ?? 0;
  const reaction = reactor.reaction_rate ?? 0;
  const flow = reactor.flow_rate ?? 0;
  const level = reactor.material_level ?? 0;
  const gas = reactor.gas_concentration ?? 0;
  const ph = reactor.ph_level ?? 7;
  const co2 = reactor.emissions_co2_ppm ?? 0;
  const risk = reactor.risk_score ?? 0;
  const rateOfChange = reactor.temp_rate_of_change ?? 0;

  const sensors = [
    {
      label: "Temperature",
      value: `${reactor.temperature != null ? temp.toFixed(1) : "—"}°C`,
      num: temp,
      min: 0,
      max: 220,
      color: temp >= T.TEMP_CRITICAL ? "var(--danger)" : "var(--text)",
      arrow: rateOfChange > 0 ? "▲" : rateOfChange < 0 ? "▼" : "",
      level: temp >= T.TEMP_CRITICAL ? "critical" : "safe",
    },
    {
      label: "Pressure",
      value: `${reactor.pressure != null ? press.toFixed(2) : "—"} bar`,
      num: press,
      min: 0,
      max: 12,
      color: press >= T.PRESSURE_CRITICAL ? "var(--danger)" : "var(--text)",
      level: press >= T.PRESSURE_CRITICAL ? "critical" : "safe",
    },
    {
      label: "Cooling",
      value: `${Math.round(cooling * 100)}%`,
      num: Math.round(cooling * 100),
      min: 0,
      max: 100,
      color: cooling <= 0.3 ? "var(--danger)" : cooling <= 0.5 ? "var(--warning)" : "var(--text)",
      level: cooling <= 0.3 ? "critical" : cooling <= 0.5 ? "warning" : "safe",
    },
    {
      label: "Reaction Rate",
      value: `${Math.round(reaction * 100)}%`,
      num: Math.round(reaction * 100),
      min: 0,
      max: 100,
      color: reaction >= 0.7 ? "var(--danger)" : reaction >= 0.4 ? "var(--warning)" : "var(--text)",
      level: reaction >= 0.7 ? "critical" : reaction >= 0.4 ? "warning" : "safe",
    },
    {
      label: "Feed Flow",
      value: `${reactor.flow_rate != null ? flow.toFixed(0) : "—"} L/m`,
      num: flow,
      min: 0,
      max: 500,
      color: flow < 10 || flow > 480 ? "var(--warning)" : "var(--text)",
      level: flow < 10 || flow > 480 ? "warning" : "safe",
    },
    {
      label: "Vessel Level",
      value: `${reactor.material_level != null ? Math.round(level) : "—"}%`,
      num: level,
      min: 0,
      max: 100,
      color: level < 5 || level > 95 ? "var(--warning)" : "var(--text)",
      level: level < 5 || level > 95 ? "warning" : "safe",
    },
    {
      label: "Off-Gas",
      value: `${reactor.gas_concentration != null ? gas.toFixed(0) : "—"} ppm`,
      num: gas,
      min: 0,
      max: 1000,
      color: gas >= T.GAS_ABORT ? "var(--danger)" : gas >= T.GAS_TOXIC ? "var(--warning)" : "var(--text)",
      level: gas >= T.GAS_ABORT ? "critical" : gas >= T.GAS_TOXIC ? "warning" : "safe",
    },
    {
      label: "pH Level",
      value: reactor.ph_level != null ? ph.toFixed(1) : "—",
      num: ph,
      min: 0,
      max: 14,
      color: ph <= T.PH_LOW_DANGER || ph >= T.PH_HIGH_DANGER ? "var(--danger)" : ph <= T.PH_LOW_WARNING || ph >= T.PH_HIGH_WARNING ? "var(--warning)" : "var(--text)",
      level: ph <= T.PH_LOW_DANGER || ph >= T.PH_HIGH_DANGER ? "critical" : ph <= T.PH_LOW_WARNING || ph >= T.PH_HIGH_WARNING ? "warning" : "safe",
    },
    {
      label: "CO₂ Effluent",
      value: `${reactor.emissions_co2_ppm != null ? co2.toFixed(0) : "—"} ppm`,
      num: co2,
      min: 0,
      max: 5000,
      color: co2 >= T.CO2_CRITICAL ? "var(--danger)" : co2 >= T.CO2_WARNING ? "var(--warning)" : "var(--text)",
      level: co2 >= T.CO2_CRITICAL ? "critical" : co2 >= T.CO2_WARNING ? "warning" : "safe",
    },
    {
      label: "AI Risk Score",
      value: `${Math.round(risk)}%`,
      num: Math.round(risk),
      min: 0,
      max: 100,
      color: risk >= T.CRITICAL ? "var(--danger)" : risk >= T.WARNING ? "var(--warning)" : "var(--success)",
      level: risk >= T.CRITICAL ? "critical" : risk >= T.WARNING ? "warning" : "safe",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      {sensors.map((s) => (
        <div
          key={s.label}
          role="meter"
          aria-label={`${s.label}: ${s.value}`}
          aria-valuenow={s.num}
          aria-valuemin={s.min}
          aria-valuemax={s.max}
          title={`${s.label}: ${s.value} — ${s.level}`}
          className="p-3 transition-all hover:border-slate-600"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 10,
          }}
        >
          <p
            className="text-[10px] uppercase tracking-wider font-semibold"
            style={{ color: "var(--text-muted)" }}
          >
            {s.label}
          </p>
          <p
            className="text-base font-bold mt-1 tabular-nums flex items-center justify-between"
            style={{ color: s.color }}
          >
            <span>{s.value}</span>
            {s.arrow && (
              <span className="text-xs ml-1" aria-hidden="true">
                {s.arrow}
              </span>
            )}
          </p>
        </div>
      ))}
    </div>
  );
}

export default SensorTicker;