import React from "react";
import {
  FiCheckCircle,
  FiAlertTriangle,
  FiZap,
  FiAlertOctagon,
  FiTrendingUp,
  FiShield,
} from "react-icons/fi";

// Non-color redundancy: every status is conveyed by BOTH an icon (shape)
// and a text label, never by color alone — operators may be colorblind.
// SAFE and NOMINAL are the same state; DEGRADING/RECOVERY are the 5-class
// states mapped defensively if they ever flow through from the ensemble.
const STYLES = {
  NOMINAL: { label: "NOMINAL", color: "var(--success)", Icon: FiCheckCircle, pulse: false },
  SAFE: { label: "NOMINAL", color: "var(--success)", Icon: FiCheckCircle, pulse: false },
  DEGRADING: { label: "DEGRADING", color: "#d97706", Icon: FiAlertTriangle, pulse: false },
  WARNING: { label: "WARNING", color: "var(--warning)", Icon: FiZap, pulse: false },
  CRITICAL: { label: "CRITICAL", color: "var(--danger)", Icon: FiAlertOctagon, pulse: true },
  RECOVERY: { label: "RECOVERY", color: "#3b82f6", Icon: FiTrendingUp, pulse: false },
  NORMAL: { label: "NORMAL", color: "#3b82f6", Icon: FiCheckCircle, pulse: false },
  RECOMMENDED: { label: "RECOMMENDED", color: "#3b82f6", Icon: FiTrendingUp, pulse: false },
};

function StatusBadge({ status, resolved }) {
  if (resolved) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
        style={{ backgroundColor: "var(--text-muted)", color: "var(--card)" }}
      >
        <FiCheckCircle size={12} aria-hidden="true" />
        RESOLVED
      </span>
    );
  }
  const s =
    STYLES[status] || {
      label: status || "UNKNOWN",
      color: "var(--text-muted)",
      Icon: FiShield,
      pulse: false,
    };
  const Icon = s.Icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
      style={{
        backgroundColor: s.color,
        color: "#fff",
        animation: s.pulse ? "thermalai-pulse 1s infinite" : "none",
      }}
    >
      <Icon size={12} aria-hidden="true" />
      {s.label}
    </span>
  );
}

export default StatusBadge;
