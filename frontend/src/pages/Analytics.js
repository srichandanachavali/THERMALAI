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

// Sensor tabs — each drives the featured chart + reference lines at thresholds.
const WARN = "#f59e0b";
const CRIT = "#ef4444";
const SENSOR_TABS = [
  { key: "temperature", label: "Temperature", stroke: "#f97316", domain: [0, 220], refs: [{ y: 162, label: "crit", color: CRIT }] },
  { key: "risk_score", label: "AI Risk", stroke: "#ef4444", domain: [0, 100], refs: [{ y: 70, label: "crit", color: CRIT }] },
  { key: "pressure", label: "Pressure", stroke: "#60a5fa", domain: [0, 12], refs: [{ y: 8, label: "warn", color: WARN }] },
  { key: "cooling_efficiency", label: "Cooling", stroke: "#22c55e", domain: [0, 1], refs: [{ y: 0.5, label: "warn", color: WARN }] },
  { key: "flow_rate", label: "Flow Rate", stroke: "#34d399", domain: [0, 500], refs: [{ y: 10, label: "low", color: WARN }, { y: 480, label: "high", color: WARN }] },
  { key: "material_level", label: "Material Level", stroke: "#a3e635", domain: [0, 100], refs: [{ y: 5, label: "low", color: WARN }, { y: 95, label: "high", color: WARN }] },
  { key: "gas_concentration", label: "Gas Conc.", stroke: "#f87171", domain: [0, 1000], refs: [{ y: 25, label: "danger", color: WARN }, { y: 500, label: "abort", color: CRIT }] },
  { key: "ph_level", label: "pH Level", stroke: "#c084fc", domain: [0, 14], refs: [{ y: 3, label: "crit", color: CRIT }, { y: 4, label: "warn", color: WARN }, { y: 10, label: "warn", color: WARN }, { y: 11, label: "crit", color: CRIT }] },
  { key: "emissions_co2_ppm", label: "CO₂ Emissions", stroke: "#94a3b8", domain: [0, 5000], refs: [{ y: 2000, label: "warn", color: WARN }, { y: 4000, label: "crit", color: CRIT }] },
];

function Analytics() {
  const { id } = useParams();
  const { reactors } = useSocket();
  const [selectedReactor, setSelectedReactor] = useState(id || "A");
  const [activeSensor, setActiveSensor] = useState("temperature");

  useEffect(() => {
    if (id) setSelectedReactor(id);
  }, [id]);

  useEffect(() => {
    document.title = `ThermalAI — Analytics (${selectedReactor})`;
  }, [selectedReactor]);

  const { history } = useReactorHistory(selectedReactor, {
    format: formatHistory,
  });

  const reactorIds = ["A", "B", "C", "D", "E"];
  const reactor = reactors.find((r) => r.reactor_id === selectedReactor);
  const featured = SENSOR_TABS.find((t) => t.key === activeSensor);

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

      {/* Sensor tabs */}
      <div className="flex gap-2 mb-6">
        {SENSOR_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSensor(tab.key)}
            className="text-sm font-semibold px-4 py-1.5 rounded-full transition-colors"
            style={{
              backgroundColor: activeSensor === tab.key ? "var(--accent)" : "var(--card)",
              color: activeSensor === tab.key ? "#fff" : "var(--textSub)",
              border: `1px solid ${activeSensor === tab.key ? "var(--accent)" : "var(--border)"}`,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Charts */}
      {history.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-16 text-center">
          <p className="text-gray-400 text-xl">No history available yet</p>
          <p className="text-gray-500 mt-2">
            Start the data stream to see trends
          </p>
        </div>
      ) : (
        <div>
          {/* Featured sensor chart (threshold reference lines) */}
          <div className="mb-6">
            <MetricLineChart
              data={history}
              dataKey={featured.key}
              stroke={featured.stroke}
              title={`${featured.label} History`}
              titleClassName="text-white font-semibold mb-4"
              tickFontSize={10}
              domain={featured.domain}
              refs={featured.refs}
            />
          </div>

          {/* Full grid */}
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
        </div>
      )}
    </div>
  );
}

export default Analytics;
