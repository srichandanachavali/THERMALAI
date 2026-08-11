import React from "react";

// ASM HMI data-quality chip. Renders status badge according to sensor validation state.
function DataQualityIndicator({ quality = "good", sensorValidation }) {
  if (!sensorValidation && quality === "good") {
    return (
      <span className="status-nominal inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: "var(--success, #10b981)" }}
          aria-hidden="true"
        />
        Data quality: Good
      </span>
    );
  }

  const isDegraded = quality === "degraded" || quality === "bad" || (sensorValidation && sensorValidation.is_degraded);

  if (!isDegraded) {
    return (
      <span className="status-nominal inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold">
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: "var(--success, #10b981)" }}
          aria-hidden="true"
        />
        Data quality: Good
      </span>
    );
  }

  const faultNote = sensorValidation?.fault_note || sensorValidation?.message || "Sensor drift or noise detected";
  const voterSpread = sensorValidation?.voter_spread_celsius;

  return (
    <span className="status-warning inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold">
      <span
        className="w-2 h-2 rounded-full animate-pulse"
        style={{ backgroundColor: "var(--warning, #f59e0b)" }}
        aria-hidden="true"
      />
      <span>Data quality: Degraded</span>
      {faultNote && <span className="opacity-90">— {faultNote}</span>}
      {voterSpread != null && (
        <span className="font-mono">(voter spread {Number(voterSpread).toFixed(1)}°C)</span>
      )}
    </span>
  );
}

export default DataQualityIndicator;