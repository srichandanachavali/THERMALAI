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

function MetricLineChart({
  data,
  dataKey,
  stroke,
  title,
  domain,
  height = 200,
  titleClassName = "text-gray-300 font-semibold mb-4 text-sm uppercase tracking-wide",
  tickFontSize = 10,
  referenceY,
  referenceLabel,
  refs,
}) {
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className={titleClassName}>{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="time" stroke="var(--textMuted)" tick={{ fontSize: tickFontSize }} />
          <YAxis
            stroke="var(--textMuted)"
            tick={{ fontSize: tickFontSize }}
            domain={domain}
          />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          />
          {refs &&
            refs.map((r, i) => (
              <ReferenceLine
                key={i}
                y={r.y}
                stroke={r.color || "#ef4444"}
                strokeDasharray="4 4"
                label={{ value: r.label, fill: r.color || "#ef4444", fontSize: 10 }}
              />
            ))}
          {!refs && referenceY !== undefined && (
            <ReferenceLine
              y={referenceY}
              stroke="#ef4444"
              strokeDasharray="5 5"
              label={referenceLabel || { value: "warn", fill: "#ef4444", fontSize: 10 }}
            />
          )}
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={stroke}
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default MetricLineChart;
