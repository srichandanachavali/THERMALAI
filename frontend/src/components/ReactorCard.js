import React from "react";
import { FiAlertTriangle } from "react-icons/fi";
import StatusBadge from "./StatusBadge";
import { ReactorGauge, SensorRow, sensorRows, extendedRows } from "./ReactorSensors";
import { getReactorConfig, RISK_THRESHOLDS } from "../constants/reactors";

// Compact reactor card for the Home grid: risk gauge + sensor progress rows.
// `critical`/`degrading` enable Level-1 pinning treatments (red pulsing border +
// IMMEDIATE ACTION banner, and amber degrading border respectively).
function ReactorCard({ reactor, onClick, critical, degrading }) {
  const config = getReactorConfig(reactor.reactor_id);
  const statusClass = {
    NOMINAL: "hmi-safe",
    SAFE: "hmi-safe",
    DEGRADING: "hmi-warning",
    WARNING: "hmi-warning",
    CRITICAL: "hmi-critical",
    RECOVERY: "hmi-safe",
  }[reactor.status] || "hmi-safe";

  const isCritical = critical ?? reactor.status === "CRITICAL";
  const isDegrading = degrading ?? reactor.status === "DEGRADING";
  const gasAlert = (reactor.gas_concentration ?? 0) > RISK_THRESHOLDS.GAS_TOXIC;

  return (
    <div
      onClick={onClick}
      tabIndex={0}
      role="button"
      aria-label={`${config.tag} ${config.name}, status ${isCritical ? "CRITICAL" : isDegrading ? "DEGRADING" : reactor.status}, risk ${reactor.risk_score}%. Open reactor detail.`}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className={`p-5 cursor-pointer transition-colors relative ${statusClass}`}
      style={{
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
      }}
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
      <ReactorGauge score={reactor.risk_score} status={reactor.status} reactor={reactor} />
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
