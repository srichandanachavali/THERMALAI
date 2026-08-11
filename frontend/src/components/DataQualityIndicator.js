import React from "react";

/**
 * DataQualityIndicator - Shows sensor validation status from safety layer
 * (voting + Kalman filtering). Receives enrichedReading with:
 * - data_quality: 'good' | 'degraded'
 * - temp_validation: { sensor_fault_suspected, validated_temperature, voter_spread_celsius, voters }
 * - kalman_smoothed: { temperature, pressure, cooling_efficiency, ... }
 */
function DataQualityIndicator({ reading, compact = false }) {
  if (!reading) return null;

  const quality = reading.data_quality || 'good';
  const tempVal = reading.temp_validation;
  const kalman = reading.kalman_smoothed;
  const isDegraded = quality === 'degraded';
  const faultSuspected = tempVal?.sensor_fault_suspected === true;

  if (compact) {
    return (
      <span
        className={`data-quality-indicator ${isDegraded ? 'data-quality-degraded' : 'data-quality-good'}`}
        title={faultSuspected
          ? `Sensor fault suspected — validated: ${tempVal?.validated_temperature?.toFixed(1)}°C (spread: ${tempVal?.voter_spread_celsius?.toFixed(1)}°C)`
          : 'Data quality: GOOD'}
      >
        <span className="data-quality-indicator-dot" aria-hidden="true" />
        <span className="sr-only">
          {isDegraded ? 'Data quality: DEGRADED' : 'Data quality: GOOD'}
        </span>
      </span>
    );
  }

  return (
    <div className={`data-quality-indicator ${isDegraded ? 'data-quality-degraded' : 'data-quality-good'}`}>
      <span className="data-quality-indicator-dot" aria-hidden="true" />
      <span>
        {isDegraded ? 'DEGRADED' : 'GOOD'}
      </span>
      {faultSuspected && (
        <span className="ml-2 text-[10px]" style={{ color: "var(--warning)" }}>
          Sensor fault suspected — median: {tempVal?.validated_temperature?.toFixed(1)}°C
          <span className="ml-2">(spread: {tempVal?.voter_spread_celsius?.toFixed(1)}°C)</span>
        </span>
      )}
      {kalman && (
        <span className="ml-2 text-[10px]" style={{ color: "var(--text-sub)" }}>
          Kalman smoothed: {kalman.temperature?.toFixed(1)}°C
        </span>
      )}
    </div>
  );
}

export default DataQualityIndicator;