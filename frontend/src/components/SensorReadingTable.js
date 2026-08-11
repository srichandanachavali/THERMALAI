import React from "react";

// HMI status class drives the left accent on the latest (most recent) row.
const STATUS_CLASS = {
  CRITICAL: "status-critical",
  WARNING: "status-warning",
  DEGRADING: "status-degrading",
  RECOVERY: "status-recovery",
  SAFE: "status-nominal",
  NOMINAL: "status-nominal",
};

const columns = [
  { key: "timestamp", label: "Time", format: (v) => (v ? new Date(v).toLocaleTimeString() : "—") },
  { key: "temperature", label: "Temp (°C)", format: (v) => v?.toFixed?.(1) ?? "—" },
  { key: "pressure", label: "Pressure (bar)", format: (v) => v?.toFixed?.(2) ?? "—" },
  { key: "reaction_rate", label: "Reaction (%)", format: (v) => `${Math.round((v || 0) * 100)}%` },
  { key: "cooling_efficiency", label: "Cooling (%)", format: (v) => `${Math.round((v || 0) * 100)}%` },
  { key: "risk_score", label: "Risk (%)", format: (v) => `${v ?? "—"}%` },
  { key: "status", label: "Status", format: (v) => v ?? "—" },
];

// Last-10 sensor readings table. The most recent row carries the HMI
// status-* class, giving it a colored left accent via .sensor-table tr.latest.
function SensorReadingTable({ readings = [], reactor }) {
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
            <td colSpan={columns.length} style={{ color: "var(--text-muted)" }}>
              No readings yet — stream data is required
            </td>
          </tr>
        ) : (
          rows.map((r, i) => {
            const statusClass = STATUS_CLASS[r.status] || "status-nominal";
            const risk = r.risk_score;
            return (
              <tr key={i} className={i === lastIdx ? `latest ${statusClass}` : ""}>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={
                      col.key === "risk_score"
                        ? risk >= 70
                          ? "param-value critical"
                          : risk >= 30
                            ? "param-value warning"
                            : ""
                        : ""
                    }
                  >
                    {col.format(r[col.key])}
                  </td>
                ))}
              </tr>
            );
          })
        )}
      </tbody>
    </table>
  );
}

export default SensorReadingTable;
