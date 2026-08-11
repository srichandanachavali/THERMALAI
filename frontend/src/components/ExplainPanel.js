import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { RISK_THRESHOLDS } from "../constants/reactors";

const API =
  process.env.REACT_APP_API_URL?.replace('/api', '') ||
  "http://localhost:5000";

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
    if (reactor && reactor.risk_score > 0) {
      fetchExplanation();
    }
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

  if (!explanation) return null;

  const getBorderColor = () => {
    if (explanation.risk_score >= RISK_THRESHOLDS.CRITICAL) return "border-red-500";
    if (explanation.risk_score >= RISK_THRESHOLDS.WARNING) return "border-yellow-500";
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

      {/* Overall assessment */}
      <div
        className={`text-sm font-bold mb-4 ${
          explanation.risk_score >= RISK_THRESHOLDS.CRITICAL
            ? "text-red-400"
            : explanation.risk_score >= RISK_THRESHOLDS.WARNING
              ? "text-yellow-400"
              : "text-green-400"
        }`}
      >
        {explanation.overall}
      </div>

      {/* Reasons */}
      <div className="mb-4">
        <p className="text-xs uppercase tracking-wide mb-2" style={{ color: "var(--text-sub)" }}>
          Why risk is high
        </p>
        <div className="space-y-2">
          {(explanation.reasons || []).map((reason, index) => (
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
          {(explanation.recommendations || []).map((rec, index) => (
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