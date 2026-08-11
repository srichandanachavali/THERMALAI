import React from "react";
import DataQualityIndicator from "./DataQualityIndicator";

// Last-reading sensor table — shows data quality inline for the COCKPIT view.
function SensorReadingTable({ reactor }) {
  const currentReading = {
    timestamp: reactor.timestamp || new Date().toISOString(),
    temperature: reactor.temperature,
    pressure: reactor.pressure,
    cooling_efficiency: reactor.cooling_efficiency,
    reaction_rate: reactor.reaction_rate,
    temp_rate_of_change: reactor.temp_rate_of_change,
    flow_rate: reactor.flow_rate,
    material_level: reactor.material_level,
    gas_concentration: reactor.gas_concentration,
    ph_level: reactor.ph_level,
    emissions_co2_ppm: reactor.emissions_co2_ppm,
    risk_score: reactor.risk_score,
    status: reactor.status,
    data_quality: reactor.data_quality,
    temp_validation: reactor.temp_validation,
    kalman_smoothed: reactor.kalman_smoothed,
  };

  const columns = [
    { key: 'timestamp', label: 'Time', format: (v) => new Date(v).toLocaleTimeString() },
    { key: 'temperature', label: 'Temp (°C)', format: (v) => v?.toFixed(1) ?? '—' },
    { key: 'pressure', label: 'Press (bar)', format: (v) => v?.toFixed(2) ?? '—' },
    { key: 'cooling_efficiency', label: 'Cool (%)', format: (v) => `${Math.round((v || 0) * 100)}%` },
    { key: 'reaction_rate', label: 'Rate', format: (v) => `${Math.round((v || 0) * 100)}%` },
    { key: 'temp_rate_of_change', label: 'ΔT/cycle', format: (v) => v?.toFixed(1) ?? '—' },
    { key: 'risk_score', label: 'Risk %', format: (v) => `${v ?? '—'}%` },
    { key: 'status', label: 'Status', format: (v) => v ?? '—' },
  ];

  return (
    <table className="sensor-table">
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key}>{col.label}</th>
          ))}
          <th>Data Quality</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          {columns.map((col) => (
            <td key={col.key} className={col.key === 'risk_score' && reactor.risk_score >= 70 ? 'param-value critical' : col.key === 'risk_score' && reactor.risk_score >= 30 ? 'param-value warning' : ''}>
              {col.format(currentReading[col.key])}
            </td>
          ))}
          <td>
            <DataQualityIndicator reading={currentReading} />
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export default SensorReadingTable;
