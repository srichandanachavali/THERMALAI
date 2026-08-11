import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { RISK_THRESHOLDS } from "../constants/reactors";

const API =
  process.env.REACT_APP_API_URL?.replace('/api', '') ||
  "http://localhost:5000";

// Fallback baseline drivers when ML engine reports 0% anomaly
const BASELINE_DRIVERS = [
  { sensor: "temperature", contribution: 0, direction: "stable", current_value: 0 },
  { sensor: "pressure", contribution: 0, direction: "stable", current_value: 0 },
  { sensor: "cooling_efficiency", contribution: 0, direction: "stable", current_value: 0 },
  { sensor: "ph_level", contribution: 0, direction: "stable", current_value: 0 },
];

const DRIVER_LABELS = {
  temperature: "Reactor Temperature",
  pressure: "Vessel Pressure",
  cooling_efficiency: "Cooling Efficiency",
  reaction_rate: "Reaction Progress Rate",
  flow_rate: "Feed Flow Rate",
  material_level: "Material Level",
  gas_concentration: "Off-gas Concentration",
  ph_level: "pH Level",
  emissions_co2_ppm: "CO₂ Effluent Level",
  risk_score: "Composite Risk Score",
  jacket_temp_delta: "Jacket Temp Delta",
  pressure_margin: "Pressure Safety Margin",
  agitator_rpm: "Agitator Speed (RPM)",
};

function ExplainPanel({ reactor }) {
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchExplanation = useCallback(async () => {
    if (!reactor) return;
    setLoading(true);
    try {
      const response = await axios.post(
        `${API}/api/reactors/explain`,
        {
          reactor_id: reactor.reactor_id || reactor.id,
          temperature: reactor.temperature,
          pressure: reactor.pressure,
          cooling_efficiency: reactor.cooling_efficiency,
          reaction_rate: reactor.reaction_rate,
          flow_rate: reactor.flow_rate,
          material_level: reactor.material_level,
          gas_concentration: reactor.gas_concentration,
          ph_level: reactor.ph_level,
          emissions_co2_ppm: reactor.emissions_co2_ppm,
          risk_score: reactor.risk_score,
          temp_rate_of_change: reactor.temp_rate_of_change,
        }
      );
      setExplanation(response.data);
    } catch {
      // Fallback on request failure
      setExplanation(null);
    }
    setLoading(false);
  }, [reactor]);

  useEffect(() => {
    if (reactor) fetchExplanation();
  }, [reactor, fetchExplanation]);

  if (loading && !explanation) {
    return (
      <div className="rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
        <h3 className="font-semibold mb-4 text-lg" style={{ color: "var(--text)" }}>🧠 AI Feature Attribution & SHAP Analysis</h3>
        <div className="text-center py-6" style={{ color: "var(--text-sub)" }}>
          Analyzing real-time multi-variable telemetry...
        </div>
      </div>
    );
  }

  const apiDrivers = explanation?.top_drivers || [];
  const isBaseline = apiDrivers.length === 0;
  const drivers = isBaseline ? BASELINE_DRIVERS : apiDrivers;
  const maxAbs = Math.max(1, ...drivers.map((d) => Math.abs(d.contribution ?? 0)));
  const riskScore = explanation?.risk_score ?? (reactor?.risk_score || 0);

  const overall =
    explanation?.overall ??
    (riskScore >= RISK_THRESHOLDS.CRITICAL
      ? "Critical runaway risk detected across primary sensors."
      : riskScore >= RISK_THRESHOLDS.WARNING
      ? "Warning limits breached — process intervention required."
      : "All parameters operating within normal baseline bounds.");

  const reasons = explanation?.reasons?.length
    ? explanation.reasons
    : riskScore < 30
    ? ["✅ All parameters within safe operating ranges"]
    : ["Elevated multi-sensor thermal/pressure variance"];

  const recommendations = explanation?.recommendations?.length
    ? explanation.recommendations
    : riskScore < 30
    ? ["Maintain steady-state operation"]
    : ["Increase coolant circulation and observe pressure trend"];

  const getBorderColor = () => {
    if (riskScore >= RISK_THRESHOLDS.CRITICAL) return "border-red-500";
    if (riskScore >= RISK_THRESHOLDS.WARNING) return "border-yellow-500";
    return "border-emerald-500";
  };

  return (
    <div
      className={`rounded-xl p-6 border-l-4 ${getBorderColor()}`}
      style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
    >
      <h3 className="font-semibold text-lg mb-2" style={{ color: "var(--text)" }}>
        🧠 AI Feature Attribution & SHAP Analysis
      </h3>

      {/* Ensemble Model Badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className="bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold px-3 py-1 rounded-full">
          🧠 Multi-Variable SHAP Explainer
        </span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>integrated ensemble feature importance</span>
      </div>

      {/* SHAP Feature Contributions */}
      <div className="mb-5">
        <p className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: "var(--text-sub)" }}>
          Feature Risk Contributions (SHAP Values)
        </p>
        <div className="space-y-3">
          {drivers.map((d, index) => {
            const pct = Math.min(100, Math.round((Math.abs(d.contribution ?? 0) / maxAbs) * 100));
            const pushesRiskUp = d.direction !== "decreasing";
            const rawSensorKey = d.sensor || "temperature";
            const label = DRIVER_LABELS[rawSensorKey] || rawSensorKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
            return (
              <div key={index}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium" style={{ color: "var(--text)" }}>{label}</span>
                  <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>{pct}%</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255, 255, 255, 0.08)" }}>
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: pushesRiskUp ? "#ef4444" : "#10b981",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {isBaseline && (
          <p className="text-xs mt-3" style={{ color: "var(--text-muted)" }}>
            Nominal operating state — no single telemetry parameter is driving risk elevation.
          </p>
        )}
      </div>

      {/* Overall Risk Assessment */}
      <div
        className={`text-sm font-bold mb-4 p-3 rounded-lg ${
          riskScore >= RISK_THRESHOLDS.CRITICAL
            ? "bg-red-500/10 text-red-400 border border-red-500/30"
            : riskScore >= RISK_THRESHOLDS.WARNING
            ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30"
            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
        }`}
      >
        {overall}
      </div>

      {/* Root Causes / Reasons */}
      <div className="mb-4">
        <p className="text-xs uppercase tracking-wider font-semibold mb-2" style={{ color: "var(--text-sub)" }}>
          Identified Root Drivers & Anomaly Triggers
        </p>
        <div className="space-y-2">
          {reasons.map((reason, index) => (
            <div
              key={index}
              className="rounded-lg p-3 text-sm font-medium"
              style={{ backgroundColor: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              {reason}
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div>
        <p className="text-xs uppercase tracking-wider font-semibold mb-2" style={{ color: "var(--text-sub)" }}>
          Recommended Operator Actions
        </p>
        <div className="space-y-2">
          {recommendations.map((rec, index) => (
            <div
              key={index}
              className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm font-medium text-blue-300"
            >
              → {rec}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ExplainPanel;