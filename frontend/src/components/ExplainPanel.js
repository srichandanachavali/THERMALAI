import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";

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
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-white font-semibold mb-4">🧠 AI Explanation</h3>
        <div className="text-gray-400 text-center py-4">
          Analyzing reactor data...
        </div>
      </div>
    );
  }

  if (!explanation) return null;

  const getBorderColor = () => {
    if (explanation.risk_score >= 70) return "border-red-500";
    if (explanation.risk_score >= 30) return "border-yellow-500";
    return "border-green-500";
  };

  return (
    <div
      className={`bg-gray-800 rounded-lg p-6 border-l-4 ${getBorderColor()}`}
    >
      <h3 className="text-white font-semibold text-lg mb-2">
        🧠 AI Explanation
      </h3>

      {/* LSTM Badge */}
      <div className="flex items-center gap-2 mb-3">
        <span className="bg-purple-500/20 border border-purple-500/30 text-purple-400 text-xs font-bold px-3 py-1 rounded-full">
          🧠 LSTM + Random Forest Ensemble
        </span>
        <span className="text-gray-500 text-xs">dual AI analysis</span>
      </div>

      {/* Overall assessment */}
      <div
        className={`text-sm font-bold mb-4 ${
          explanation.risk_score >= 70
            ? "text-red-400"
            : explanation.risk_score >= 30
              ? "text-yellow-400"
              : "text-green-400"
        }`}
      >
        {explanation.overall}
      </div>

      {/* Reasons */}
      <div className="mb-4">
        <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">
          Why risk is high
        </p>
        <div className="space-y-2">
          {(explanation.reasons || []).map((reason, index) => (
            <div
              key={index}
              className="bg-gray-700 rounded-lg p-3 text-sm text-gray-200"
            >
              {reason}
            </div>
          ))}
        </div>
      </div>

      {/* Recommendations */}
      <div>
        <p className="text-gray-400 text-xs uppercase tracking-wide mb-2">
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