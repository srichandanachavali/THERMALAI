import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import MetricLineChart from "../components/MetricLineChart";
import ReactorSelector from "../components/ReactorSelector";
import CurrentStatusCard from "../components/CurrentStatusCard";
import useReactorHistory from "../hooks/useReactorHistory";

// Module-scope so the hook's format reference is stable across renders.
const formatHistory = (d, i) => ({
  ...d,
  time: new Date(d.timestamp).toLocaleTimeString(),
  index: i,
});

function Analytics() {
  const { id } = useParams();
  const { reactors } = useSocket();
  const [selectedReactor, setSelectedReactor] = useState(id || "A");

  useEffect(() => {
    if (id) setSelectedReactor(id);
  }, [id]);

  const { history } = useReactorHistory(selectedReactor, {
    format: formatHistory,
  });

  const reactorIds = ["A", "B", "C", "D", "E"];
  const reactor = reactors.find((r) => r.reactor_id === selectedReactor);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Analytics</h1>
          <p className="text-gray-400 mt-1">
            Historical trends and pattern analysis
          </p>
        </div>

        {/* Reactor Selector */}
        <ReactorSelector
          reactorIds={reactorIds}
          selected={selectedReactor}
          onSelect={setSelectedReactor}
        />
      </div>

      {/* Current Status */}
      <CurrentStatusCard reactor={reactor} />

      {/* Charts */}
      {history.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-16 text-center">
          <p className="text-gray-400 text-xl">No history available yet</p>
          <p className="text-gray-500 mt-2">
            Start the data stream to see trends
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6">
          <MetricLineChart
            data={history}
            dataKey="temperature"
            stroke="#f97316"
            title="🌡️ Temperature History"
            titleClassName="text-white font-semibold mb-4"
            tickFontSize={9}
          />
          <MetricLineChart
            data={history}
            dataKey="risk_score"
            stroke="#ef4444"
            title="🤖 AI Risk Score History"
            titleClassName="text-white font-semibold mb-4"
            tickFontSize={9}
            domain={[0, 100]}
          />
          <MetricLineChart
            data={history}
            dataKey="pressure"
            stroke="#60a5fa"
            title="💨 Pressure History"
            titleClassName="text-white font-semibold mb-4"
            tickFontSize={9}
          />
          <MetricLineChart
            data={history}
            dataKey="cooling_efficiency"
            stroke="#22c55e"
            title="❄️ Cooling Efficiency History"
            titleClassName="text-white font-semibold mb-4"
            tickFontSize={9}
            domain={[0, 1]}
          />
        </div>
      )}
    </div>
  );
}

export default Analytics;
