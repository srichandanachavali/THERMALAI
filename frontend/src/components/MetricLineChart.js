import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
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
}) {
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className={titleClassName}>{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: tickFontSize }} />
          <YAxis
            stroke="#6b7280"
            tick={{ fontSize: tickFontSize }}
            domain={domain}
          />
          <Tooltip
            contentStyle={{
              background: "#1f2937",
              border: "none",
              color: "white",
            }}
          />
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
