import React from "react";

// One alert as a row in the Alerts audit-log table.
function AlertRow({ alert, onSelect }) {
  const gasCritical = (alert.gas_concentration ?? 0) > 25 && !alert.resolved;

  const pillStyle = () => {
    if (alert.resolved) return { backgroundColor: "var(--textMuted)", color: "var(--card)" };
    if (alert.alert_type === "CRITICAL") return { backgroundColor: "var(--danger)", color: "#fff" };
    return { backgroundColor: "var(--warning)", color: "var(--bg)" };
  };

  const riskColor = () => {
    if (alert.resolved) return "var(--textMuted)";
    if (alert.alert_type === "CRITICAL") return "var(--danger)";
    return "var(--warning)";
  };

  const paramSubtext = () => {
    if (alert.parameter_alerts && alert.parameter_alerts.length) {
      return alert.parameter_alerts
        .map((p) => `${p.param.replace(/_/g, " ")} ${p.value} (${p.severity})`)
        .join(" • ");
    }
    const parts = [];
    if ((alert.gas_concentration ?? 0) > 25) parts.push(`Gas ${alert.gas_concentration}ppm`);
    if ((alert.ph_level ?? 7) < 4 || (alert.ph_level ?? 7) > 10) parts.push(`pH ${alert.ph_level}`);
    if ((alert.material_level ?? 75) < 10) parts.push(`Tank ${alert.material_level}%`);
    return parts.join(" • ");
  };

  return (
    <div
      onClick={() => onSelect && onSelect(alert.reactor_id)}
      className="grid grid-cols-[110px_1fr_1fr_110px_90px_80px_90px_2fr] gap-3 px-5 py-3 items-center cursor-pointer transition-opacity"
      style={{
        borderBottom: "1px solid var(--border)",
        opacity: alert.resolved ? 0.5 : 1,
        borderLeft: gasCritical ? "3px solid var(--danger)" : "3px solid transparent",
        animation: gasCritical ? "thermalai-pulse 1.5s infinite" : "none",
      }}
      onMouseEnter={(e) => {
        if (!alert.resolved) e.currentTarget.style.backgroundColor = "var(--accentGlow)";
      }}
      onMouseLeave={(e) => {
        if (!alert.resolved) e.currentTarget.style.backgroundColor = "transparent";
      }}
    >
      <span className="text-xs" style={{ color: "var(--textMuted)" }}>
        {new Date(alert.timestamp).toLocaleString()}
      </span>
      <span
        className="font-semibold text-sm"
        style={{
          color: alert.resolved ? "var(--textMuted)" : "var(--text)",
          textDecoration: alert.resolved ? "line-through" : "none",
        }}
      >
        Reactor {alert.reactor_id}
      </span>
      <span className="text-sm" style={{ color: "var(--textSub)" }}>
        {alert.plant_id || "—"}
      </span>
      <span>
        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={pillStyle()}>
          {alert.resolved ? "RESOLVED" : alert.alert_type}
        </span>
      </span>
      <span className="font-bold text-sm" style={{ color: riskColor() }}>
        {alert.risk_score}%
      </span>
      <span className="text-sm" style={{ color: "var(--text)" }}>
        {alert.temperature}°C
      </span>
      <span className="text-sm" style={{ color: "var(--text)" }}>
        {alert.pressure} bar
      </span>
      <span className="min-w-0">
        <span className="block text-sm truncate" style={{ color: "var(--textSub)" }}>
          {alert.message}
        </span>
        {paramSubtext() && (
          <span className="block text-[11px] truncate mt-0.5" style={{ color: "var(--danger)" }}>
            {paramSubtext()}
          </span>
        )}
      </span>
    </div>
  );
}

export default AlertRow;
