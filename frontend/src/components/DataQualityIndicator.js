import React from "react";

// ASM HMI data-quality chip. Renders nothing until the ML safety layer
// returns sensor_validation; degraded reads surface as an amber chip.
function DataQualityIndicator({ quality, sensorValidation }) {
  if (!sensorValidation) return null;

  if (quality === "good") {
    return (
      <span className="status-nominal inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: "var(--hmi-text-muted)" }}
          aria-hidden="true"
        />
        Data quality: Good
      </span>
    );
  }

  return (
    <span className="status-warning inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold">
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: "var(--hmi-warning)" }}
        aria-hidden="true"
      />
      <span>Data quality: Degraded</span>
      {sensorValidation.fault_note && <span>— {sensorValidation.fault_note}</span>}
      {sensorValidation.voter_spread_celsius != null && (
        <span>(voter spread {sensorValidation.voter_spread_celsius.toFixed(1)}°C)</span>
      )}
    </span>
  );
}

export default DataQualityIndicator;
