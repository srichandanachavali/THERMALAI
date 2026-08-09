import React from "react";

// Compact reactor card for the Home grid: risk gauge + sensor progress rows.
function ReactorCard({ reactor, onClick }) {
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

  const statusPill = (status) => {
    const bg =
      status === "SAFE"
        ? "var(--success)"
        : status === "WARNING"
          ? "var(--warning)"
          : "var(--danger)";
    return (
      <span
        className="text-[11px] font-bold px-2.5 py-1 rounded-full"
        style={{ color: "#fff", backgroundColor: bg }}
      >
        {status}
      </span>
    );
  };

  const sensorRows = (r) => {
    const rate = r.reaction_rate || 0;
    return [
      { label: "Temperature", value: Math.min(100, (r.temperature / 200) * 100), display: `${r.temperature}°C`, color: r.temperature > 160 ? "var(--danger)" : "var(--accent)" },
      { label: "Pressure", value: Math.min(100, (r.pressure / 10) * 100), display: `${r.pressure} bar`, color: r.pressure > 8 ? "var(--danger)" : "var(--accentLight)" },
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
        color: gas < 25 ? "var(--success)" : gas <= 500 ? "var(--warning)" : "var(--danger)",
        pulse: gas > 500,
        warn: gas > 25,
      },
      {
        label: "pH Level", display: `${ph}`, value: Math.min(100, (ph / 14) * 100),
        color: ph < 3 || ph > 11 ? "var(--danger)" : ph < 4 || ph > 10 ? "var(--warning)" : "var(--success)",
      },
      {
        label: "CO₂", display: `${co2} ppm`, value: Math.min(100, (co2 / 5000) * 100),
        color: co2 > 4000 ? "var(--danger)" : co2 > 2000 ? "var(--warning)" : "var(--success)",
      },
    ];
  };

  const gasAlert = (reactor.gas_concentration ?? 0) > 25;

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
    <div key={s.label}>
      <div className="flex justify-between text-xs mb-1">
        <span style={{ color: "var(--textSub)" }}>
          {s.label}
          {s.warn && <span className="ml-1" style={{ color: "var(--danger)" }}>⚠</span>}
        </span>
        <span style={{ color: "var(--text)" }}>{s.display}</span>
      </div>
      <div
        className="h-1 rounded-full"
        style={{ backgroundColor: "var(--border)" }}
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
      className="p-5 cursor-pointer transition-colors"
      style={{
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-bold" style={{ color: "var(--text)" }}>
          Reactor {reactor.reactor_id}
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
          {statusPill(reactor.status)}
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
