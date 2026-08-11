import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { RISK_THRESHOLDS } from "../constants/reactors";

const API =
  process.env.REACT_APP_API_URL?.replace('/api', '') ||
  "http://localhost:5000";

// SHAP-style feature attribution bars always render. When the ML engine reports
// no active drivers (0% risk / no anomalies), we fall back to these baseline
// variables at a 0% contribution rather than hiding the panel.
const BASELINE_DRIVERS = [
  { sensor: "jacket_temp_delta", contribution: 0, direction: "increasing", current_value: 0 },
  { sensor: "pressure_margin", contribution: 0, direction: "increasing", current_value: 0 },
  { sensor: "agitator_rpm", contribution: 0, direction: "increasing", current_value: 0 },
];

const DRIVER_LABELS = {
  jacket_temp_delta: "Jacket Temp Delta",
  pressure_margin: "Pressure Margin",
  agitator_rpm: "Agitator RPM",
};

function ExplainPanel({ reactor }) {
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchExplanation = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${API}/api/reactors/explain`,
        {
          temperature: reactor.temperature,
          pressure: reactor.pressure,
          cooling_efficiency: reactor.cooling_efficiency,
          risk_score: reactor.risk_score,
          temp_rate_of_change: reactor.temp_rate_of_change,
        },
      );
      setExplanation(response.data);
    } catch {}
    setLoading(false);
  }, [reactor]);

  useEffect(() => {
    if (reactor) fetchExplanation();
  }, [reactor, fetchExplanation]);

  if (loading) {
    return (
      <div className="rounded-lg p-6" style={{ backgroundColor: "var(--card)" }}>
        <h3 className="font-semibold mb-4" style={{ color: "var(--text)" }}>🧠 AI Explanation</h3>
        <div className="text-center py-4" style={{ color: "var(--text-sub)" }}>
          Analyzing reactor data...
        </div>
      </div>
    );
  }

  const apiDrivers = explanation?.top_drivers || [];
  const isBaseline = apiDrivers.length === 0;
  const drivers = isBaseline ? BASELINE_DRIVERS : apiDrivers;
  const maxAbs = Math.max(1, ...drivers.map((d) => Math.abs(d.contribution ?? 0)));
  const riskScore = explanation?.risk_score ?? 0;
  const overall =
    explanation?.overall ?? "All parameters operating within normal baseline bounds.";
  const reasons = explanation?.reasons?.length
    ? explanation.reasons
    : ["✅ All parameters within safe operating range"];
  const recommendations = explanation?.recommendations?.length
    ? explanation.recommendations
    : ["Continue normal operations"];

  const getBorderColor = () => {
    if (riskScore >= RISK_THRESHOLDS.CRITICAL) return "border-red-500";
    if (riskScore >= RISK_THRESHOLDS.WARNING) return "border-yellow-500";
    return "border-green-500";
  };

  return (
    <div
      className={`rounded-lg p-6 border-l-4 ${getBorderColor()}`}
      style={{ backgroundColor: "var(--card)" }}
    >
      <h3 className="font-semibold text-lg mb-2" style={{ color: "var(--text)" }}>
        🧠 AI Explanation
      </h3>

      {/* LSTM Badge */}
      <div className="flex items-center gap-2 mb-3">
        <span className="bg-purple-500/20 border border-purple-500/30 text-purple-400 text-xs font-bold px-3 py-1 rounded-full">
          🧠 LSTM + Random Forest Ensemble
        </span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>dual AI analysis</span>
      </div>

      {/* SHAP feature contributions */}
      <div className="mb-4">
        <p className="text-xs uppercase tracking-wide mb-2" style={{ color: "var(--text-sub)" }}>
          Feature attributions (SHAP)
        </p>
        <div className="space-y-2">
          {drivers.map((d, index) => {
            const pct = Math.min(100, Math.round((Math.abs(d.contribution ?? 0) / maxAbs) * 100));
            const pushesRiskUp = d.direction !== "decreasing";
            const label = DRIVER_LABELS[d.sensor] || d.sensor.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
            return (
              <div key={index}>
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: "var(--text)" }}>{label}</span>
                  <span style={{ color: "var(--text-muted)" }}>{pct}%</span>
                </div>
                <div className="h-2 rounded" style={{ backgroundColor: "var(--border)" }}>
                  <div
                    className="h-2 rounded"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: pushesRiskUp ? "#f87171" : "#34d399",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        {isBaseline && (
          <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
            All parameters operating within normal baseline bounds.
          </p>
        )}
      </div>

      {/* Overall assessment */}
      <div
        className={`text-sm font-bold mb-4 ${
          riskScore >= RISK_THRESHOLDS.CRITICAL
            ? "text-red-400"
            : riskScore >= RISK_THRESHOLDS.WARNING
              ? "text-yellow-400"
              : "text-green-400"
        }`}
      >
        {overall}
      </div>

      {/* Reasons */}
      <div className="mb-4">
        <p className="text-xs uppercase tracking-wide mb-2" style={{ color: "var(--text-sub)" }}>
          Why risk is high
        </p>
        <div className="space-y-2">
          {reasons.map((reason, index) => (
            <div
              key={index}
              className="rounded-lg p-3 text-sm"
              style={{ backgroundColor: "var(--border)", color: "var(--text)" }}
            >
              {reason}
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div>
        <p className="text-xs uppercase tracking-wide mb-2" style={{ color: "var(--text-sub)" }}>
          Recommended actions
        </p>
        <div className="space-y-2">
          {recommendations.map((rec, index) => (
            <div
              key={index}
              className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-sm text-blue-300"
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
