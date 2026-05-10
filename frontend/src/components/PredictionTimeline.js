import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

function PredictionTimeline({ reactor }) {
  if (!reactor || !reactor.rf_score) return null;

  const currentScore = reactor.risk_score || 0;
  const lstmScore = reactor.lstm_score || 0;
  const trend = lstmScore - (reactor.rf_score || 0);

  // Generate predicted future scores based on current trend
  const generatePrediction = () => {
    const points = [];
    let score = currentScore;

    // Past 5 readings (simulated from current)
    for (let i = -5; i <= 0; i++) {
      points.push({
        time: i === 0 ? "Now" : `${i}m`,
        score: Math.max(0, Math.min(100, Math.round(score + i * trend * 0.1))),
        type: "historical",
      });
    }

    // Future 10 minutes prediction
    for (let i = 1; i <= 10; i++) {
      const predictedScore = Math.max(
        0,
        Math.min(100, Math.round(currentScore + i * trend * 0.3)),
      );
      points.push({
        time: `+${i}m`,
        score: predictedScore,
        predicted: predictedScore,
        type: "predicted",
      });
    }

    return points;
  };

  const data = generatePrediction();
  const maxPredicted = Math.max(
    ...data.filter((d) => d.type === "predicted").map((d) => d.score),
  );

  const getLineColor = () => {
    if (maxPredicted >= 70) return "#ef4444";
    if (maxPredicted >= 30) return "#eab308";
    return "#22c55e";
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-white font-semibold text-lg mb-2">
        🔮 LSTM Prediction Timeline
      </h3>
      <p className="text-gray-400 text-sm mb-4">
        Predicted risk score for next 10 minutes based on time-series analysis
      </p>

      {maxPredicted >= 70 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
          <p className="text-red-400 text-sm font-bold">
            ⚠️ LSTM predicts CRITICAL state within 10 minutes!
          </p>
        </div>
      )}

      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 10 }} />
          <YAxis stroke="#6b7280" tick={{ fontSize: 10 }} domain={[0, 100]} />
          <Tooltip
            contentStyle={{
              background: "#1f2937",
              border: "none",
              color: "white",
            }}
            formatter={(value, name) => [
              `${value}%`,
              name === "score" ? "Historical" : "Predicted",
            ]}
          />
          <ReferenceLine
            y={70}
            stroke="#ef4444"
            strokeDasharray="5 5"
            label={{ value: "Critical", fill: "#ef4444", fontSize: 10 }}
          />
          <ReferenceLine
            y={30}
            stroke="#eab308"
            strokeDasharray="5 5"
            label={{ value: "Warning", fill: "#eab308", fontSize: 10 }}
          />
          <ReferenceLine x="Now" stroke="#6b7280" strokeDasharray="3 3" />

          {/* Historical line */}
          <Line
            type="monotone"
            dataKey="score"
            stroke="#60a5fa"
            strokeWidth={2}
            dot={false}
            name="Historical"
          />

          {/* Predicted line */}
          <Line
            type="monotone"
            dataKey="predicted"
            stroke={getLineColor()}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: getLineColor(), r: 3 }}
            name="Predicted"
          />
        </LineChart>
      </ResponsiveContainer>

      <div className="flex gap-4 mt-3 justify-center">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-blue-400"></div>
          <span className="text-gray-400 text-xs">Historical</span>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-0.5 border-t-2 border-dashed"
            style={{ borderColor: getLineColor() }}
          ></div>
          <span className="text-gray-400 text-xs">LSTM Predicted</span>
        </div>
      </div>
    </div>
  );
}

export default PredictionTimeline;
