import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { FiThermometer, FiShield, FiBarChart2, FiWind } from "react-icons/fi";
import MetricLineChart from "../components/MetricLineChart";
import ReactorSelector from "../components/ReactorSelector";
import useReactorHistory from "../hooks/useReactorHistory";
import { REACTOR_CONFIG, RISK_THRESHOLDS, getReactorConfig } from "../constants/reactors";

// Module-scope so the hook's format reference is stable across renders.
const formatHistory = (d, i) => ({
  ...d,
  time: new Date(d.timestamp).toLocaleTimeString(),
  index: i,
});

// Sensor tabs — each drives the featured chart + reference lines at thresholds.
const WARN = "#f59e0b";
const CRIT = "#ef4444";
const T = RISK_THRESHOLDS;
const SENSOR_TABS = [
  { key: "risk_score", label: "Risk", stroke: "#ef4444", domain: [0, 100], refs: [{ y: T.WARNING, label: "warn", color: WARN }, { y: T.CRITICAL, label: "crit", color: CRIT }] },
  { key: "temperature", label: "Temp", stroke: "#f97316", domain: [0, 220], refs: [{ y: T.TEMP_CRITICAL, label: "crit", color: CRIT }] },
  { key: "pressure", label: "Pressure", stroke: "#60a5fa", domain: [0, 12], refs: [{ y: T.PRESSURE_CRITICAL, label: "warn", color: WARN }] },
  { key: "reaction_rate", label: "Reaction", stroke: "#a78bfa", domain: [0, 1], refs: [{ y: 0.4, label: "warn", color: WARN }, { y: 0.7, label: "crit", color: CRIT }] },
  { key: "cooling_efficiency", label: "Cooling", stroke: "#22c55e", domain: [0, 1], refs: [{ y: 0.5, label: "warn", color: WARN }] },
  { key: "flow_rate", label: "Flow", stroke: "#34d399", domain: [0, 500], refs: [{ y: 10, label: "low", color: WARN }, { y: 480, label: "high", color: WARN }] },
  { key: "material_level", label: "Level", stroke: "#a3e635", domain: [0, 100], refs: [{ y: 5, label: "low", color: WARN }, { y: 95, label: "high", color: WARN }] },
  { key: "gas_concentration", label: "Gas", stroke: "#f87171", domain: [0, 1000], refs: [{ y: T.GAS_TOXIC, label: "danger", color: WARN }, { y: T.GAS_ABORT, label: "abort", color: CRIT }] },
  { key: "ph_level", label: "pH", stroke: "#c084fc", domain: [0, 14], refs: [{ y: T.PH_LOW_DANGER, label: "crit", color: CRIT }, { y: T.PH_LOW_WARNING, label: "warn", color: WARN }, { y: T.PH_HIGH_WARNING, label: "warn", color: WARN }, { y: T.PH_HIGH_DANGER, label: "crit", color: CRIT }] },
  { key: "emissions_co2_ppm", label: "CO₂", stroke: "#94a3b8", domain: [0, 5000], refs: [{ y: T.CO2_WARNING, label: "warn", color: WARN }, { y: T.CO2_CRITICAL, label: "crit", color: CRIT }] },
];

// Time-range presets — filter the loaded history by timestamp (no re-fetch).
const RANGES = { "30m": 30, "2h": 2 * 60, "8h": 8 * 60, "24h": 24 * 60 };

function Analytics() {
  const { id } = useParams();
  const [selectedReactor, setSelectedReactor] = useState(id || "A");
  const [activeSensor, setActiveSensor] = useState("temperature");
  const [range, setRange] = useState("2h");

  useEffect(() => {
    if (id) setSelectedReactor(id);
  }, [id]);

  useEffect(() => {
    document.title = `ThermalAI — Analytics (${selectedReactor})`;
  }, [selectedReactor]);

  const { history } = useReactorHistory(selectedReactor, {
    format: formatHistory,
  });

  const reactorIds = Object.keys(REACTOR_CONFIG);
  const config = getReactorConfig(selectedReactor);
  const featured = SENSOR_TABS.find((t) => t.key === activeSensor);

  // Filter history by the selected time range (client-side).
  const cutoffMs = Date.now() - (RANGES[range] || 120) * 60000;
  const filtered = history.filter((d) => {
    const t = new Date(d.timestamp).getTime();
    return Number.isNaN(t) ? true : t >= cutoffMs;
  });

  const exportCsv = () => {
    const cols = [
      "timestamp", "temperature", "pressure", "reaction_rate",
      "cooling_efficiency", "flow_rate", "material_level",
      "gas_concentration", "ph_level", "emissions_co2_ppm",
      "risk_score", "status",
    ];
    const header = cols.join(",");
    const rows = filtered.map((d) => cols.map((c) => d[c] ?? "").join(","));
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedReactor}_history_${range}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "var(--text)" }}>
            Viewing {config.tag} — {config.name}
          </h1>
          <p className="mt-1" style={{ color: "var(--text-sub)" }}>
            Historical trends and pattern analysis
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time range selector */}
          <div className="flex gap-1 p-1 rounded-lg" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
            {Object.keys(RANGES).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className="text-[11px] font-bold px-3 py-1.5 rounded-md transition-colors"
                style={{
                  backgroundColor: range === r ? "var(--accent)" : "transparent",
                  color: range === r ? "#fff" : "var(--text-sub)",
                }}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Export CSV */}
          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            style={{
              backgroundColor: "var(--accent)",
              color: "#fff",
              opacity: filtered.length === 0 ? 0.5 : 1,
            }}
          >
            Export CSV
          </button>

          {/* Reactor Selector */}
          <ReactorSelector
            reactorIds={reactorIds}
            selected={selectedReactor}
            onSelect={setSelectedReactor}
          />
        </div>
      </div>

      {/* Sensor tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {SENSOR_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSensor(tab.key)}
            className="text-sm font-semibold px-4 py-1.5 rounded-full transition-colors"
            style={{
              backgroundColor: activeSensor === tab.key ? "var(--accent)" : "var(--card)",
              color: activeSensor === tab.key ? "#fff" : "var(--text-sub)",
              border: `1px solid ${activeSensor === tab.key ? "var(--accent)" : "var(--border)"}`,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Charts */}
      {filtered.length === 0 ? (
        <div className="rounded-lg p-16 text-center" style={{ backgroundColor: "var(--card)" }}>
          <p className="text-xl" style={{ color: "var(--text-sub)" }}>No history available yet</p>
          <p className="mt-2" style={{ color: "var(--text-muted)" }}>
            Start the data stream to see trends
          </p>
        </div>
      ) : (
        <div>
          {/* Featured sensor chart (threshold reference lines) */}
          <div className="mb-6">
            <MetricLineChart
              data={filtered}
              dataKey={featured.key}
              stroke={featured.stroke}
              title={`${featured.label} History`}
              titleClassName="font-semibold mb-4"
              tickFontSize={10}
              domain={featured.domain}
              refs={featured.refs}
            />
          </div>

          {/* Correlation view — temperature vs cooling, dual-axis */}
          <div
            className="mb-6 p-6"
            style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}
          >
            <h3 className="font-semibold mb-1" style={{ color: "var(--text)" }}>
              Temperature vs Cooling Efficiency
            </h3>
            <p className="text-sm mb-4" style={{ color: "var(--text-sub)" }}>
              Cooling-runaway relationship over the selected window
            </p>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={filtered}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="time" stroke="var(--text-muted)" tick={{ fontSize: 10 }} />
                <YAxis
                  yAxisId="temp"
                  stroke="#f97316"
                  tick={{ fontSize: 10 }}
                  label={{ value: "Temp (°C)", angle: -90, position: "insideLeft", fill: "#f97316", fontSize: 10 }}
                />
                <YAxis
                  yAxisId="cooling"
                  orientation="right"
                  stroke="#22c55e"
                  domain={[0, 1]}
                  tick={{ fontSize: 10 }}
                  label={{ value: "Cooling", angle: 90, position: "insideRight", fill: "#22c55e", fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", color: "var(--text)" }}
                />
                <Legend />
                <Line yAxisId="temp" type="monotone" dataKey="temperature" name="Temp (°C)" stroke="#f97316" strokeWidth={2} dot={false} />
                <Line yAxisId="cooling" type="monotone" dataKey="cooling_efficiency" name="Cooling" stroke="#22c55e" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {/* Full grid */}
          <div className="grid grid-cols-2 gap-6">
            <MetricLineChart
              data={filtered}
              dataKey="temperature"
              stroke="#f97316"
              title={<span className="inline-flex items-center gap-2"><FiThermometer aria-hidden="true" /> Temperature History</span>}
              titleClassName="font-semibold mb-4"
              tickFontSize={9}
            />
            <MetricLineChart
              data={filtered}
              dataKey="risk_score"
              stroke="#ef4444"
              title={<span className="inline-flex items-center gap-2"><FiShield aria-hidden="true" /> AI Risk Score History</span>}
              titleClassName="font-semibold mb-4"
              tickFontSize={9}
              domain={[0, 100]}
            />
            <MetricLineChart
              data={filtered}
              dataKey="pressure"
              stroke="#60a5fa"
              title={<span className="inline-flex items-center gap-2"><FiBarChart2 aria-hidden="true" /> Pressure History</span>}
              titleClassName="font-semibold mb-4"
              tickFontSize={9}
            />
            <MetricLineChart
              data={filtered}
              dataKey="cooling_efficiency"
              stroke="#22c55e"
              title={<span className="inline-flex items-center gap-2"><FiWind aria-hidden="true" /> Cooling Efficiency History</span>}
              titleClassName="font-semibold mb-4"
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
