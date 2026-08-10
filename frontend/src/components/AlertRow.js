import React from "react";
import StatusBadge from "./StatusBadge";
import { getReactorConfig, RISK_THRESHOLDS } from "../constants/reactors";

// One alert as a row in the Alerts audit-log table.
function AlertRow({ alert, onSelect }) {
  const gasCritical =
    (alert.gas_concentration ?? 0) > RISK_THRESHOLDS.GAS_TOXIC && !alert.resolved;

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
    if ((alert.gas_concentration ?? 0) > RISK_THRESHOLDS.GAS_TOXIC) parts.push(`Gas ${alert.gas_concentration}ppm`);
    if ((alert.ph_level ?? 7) < RISK_THRESHOLDS.PH_LOW_WARNING || (alert.ph_level ?? 7) > RISK_THRESHOLDS.PH_HIGH_WARNING) parts.push(`pH ${alert.ph_level}`);
    if ((alert.material_level ?? 75) < 10) parts.push(`Tank ${alert.material_level}%`);
    return parts.join(" • ");
  };

  return (
    <div
      onClick={() => onSelect && onSelect(alert.reactor_id)}
      tabIndex={0}
      role="button"
      aria-label={`${getReactorConfig(alert.reactor_id).tag} alert, ${alert.resolved ? "resolved" : alert.alert_type}, risk ${alert.risk_score}%. Open reactor detail.`}
      onKeyDown={(e) => e.key === "Enter" && onSelect && onSelect(alert.reactor_id)}
      className="grid grid-cols-[110px_1fr_110px_90px] md:grid-cols-[110px_1fr_1fr_110px_90px_80px_90px_2fr] gap-3 px-5 py-3 items-center cursor-pointer transition-opacity"
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
        {getReactorConfig(alert.reactor_id).tag}
      </span>
      <span className="hidden md:block text-sm" style={{ color: "var(--textSub)" }}>
        {alert.plant_id || "—"}
      </span>
      <span>
        <StatusBadge status={alert.alert_type} resolved={alert.resolved} />
      </span>
      <span className="font-bold text-sm" style={{ color: riskColor() }}>
        {alert.risk_score}%
      </span>
      <span className="hidden md:block text-sm" style={{ color: "var(--text)" }}>
        {alert.temperature}°C
      </span>
      <span className="hidden md:block text-sm" style={{ color: "var(--text)" }}>
        {alert.pressure} bar
      </span>
      <span className="hidden md:block min-w-0">
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
