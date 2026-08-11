import React from "react";
import { RISK_THRESHOLDS } from "../constants/reactors";

// HMI status class drives the left accent on the latest (most recent) row.
const STATUS_CLASS = {
  CRITICAL: "status-critical",
  WARNING: "status-warning",
  DEGRADING: "status-degrading",
  RECOVERY: "status-recovery",
  SAFE: "status-nominal",
  NOMINAL: "status-nominal",
};

const T = RISK_THRESHOLDS;

const columns = [
  {
    key: "timestamp",
    label: "Time",
    format: (v) => (v ? new Date(v).toLocaleTimeString() : "—"),
  },
  {
    key: "temperature",
    label: "Temp (°C)",
    format: (v) => (v != null ? v.toFixed(1) : "—"),
    getHighlight: (v) => (v >= T.TEMP_CRITICAL ? "param-value critical" : ""),
  },
  {
    key: "pressure",
    label: "Pressure (bar)",
    format: (v) => (v != null ? v.toFixed(2) : "—"),
    getHighlight: (v) => (v >= T.PRESSURE_CRITICAL ? "param-value warning" : ""),
  },
  {
    key: "reaction_rate",
    label: "Reaction (%)",
    format: (v) => (v != null ? `${Math.round(v * 100)}%` : "—"),
    getHighlight: (v) => (v >= 0.7 ? "param-value critical" : v >= 0.4 ? "param-value warning" : ""),
  },
  {
    key: "cooling_efficiency",
    label: "Cooling (%)",
    format: (v) => (v != null ? `${Math.round(v * 100)}%` : "—"),
    getHighlight: (v) => (v != null && v <= 0.3 ? "param-value critical" : v != null && v <= 0.5 ? "param-value warning" : ""),
  },
  {
    key: "flow_rate",
    label: "Flow (L/min)",
    format: (v) => (v != null ? v.toFixed(0) : "—"),
    getHighlight: () => "",
  },
  {
    key: "material_level",
    label: "Level (%)",
    format: (v) => (v != null ? `${Math.round(v)}%` : "—"),
    getHighlight: (v) => (v != null && (v < 5 || v > 95) ? "param-value warning" : ""),
  },
  {
    key: "gas_concentration",
    label: "Gas (ppm)",
    format: (v) => (v != null ? v.toFixed(0) : "—"),
    getHighlight: (v) => (v >= T.GAS_ABORT ? "param-value critical" : v >= T.GAS_TOXIC ? "param-value warning" : ""),
  },
  {
    key: "ph_level",
    label: "pH",
    format: (v) => (v != null ? v.toFixed(1) : "—"),
    getHighlight: (v) => (v <= T.PH_LOW_DANGER || v >= T.PH_HIGH_DANGER ? "param-value critical" : v <= T.PH_LOW_WARNING || v >= T.PH_HIGH_WARNING ? "param-value warning" : ""),
  },
  {
    key: "emissions_co2_ppm",
    label: "CO₂ (ppm)",
    format: (v) => (v != null ? v.toFixed(0) : "—"),
    getHighlight: (v) => (v >= T.CO2_CRITICAL ? "param-value critical" : v >= T.CO2_WARNING ? "param-value warning" : ""),
  },
  {
    key: "risk_score",
    label: "Risk (%)",
    format: (v) => (v != null ? `${Math.round(v)}%` : "—"),
    getHighlight: (v) => (v >= T.CRITICAL ? "param-value critical" : v >= T.WARNING ? "param-value warning" : ""),
  },
  {
    key: "status",
    label: "Status",
    format: (v) => v ?? "—",
    getHighlight: () => "",
  },
];

function SensorReadingTable({ readings = [] }) {
  const rows = readings.slice(-10);
  const lastIdx = rows.length - 1;

  return (
    <table className="sensor-table">
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key}>{col.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={columns.length} style={{ color: "var(--text-muted)", textAlign: "center" }}>
              No readings yet — stream data is required
            </td>
          </tr>
        ) : (
          rows.map((r, i) => {
            const statusClass = STATUS_CLASS[r.status] || "status-nominal";
            return (
              <tr key={i} className={i === lastIdx ? `latest ${statusClass}` : ""}>
                {columns.map((col) => {
                  const val = r[col.key];
                  const highlightClass = col.getHighlight ? col.getHighlight(val) : "";
                  return (
                    <td key={col.key} className={highlightClass}>
                      {col.format(val)}
                    </td>
                  );
                })}
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}

export default SensorReadingTable;