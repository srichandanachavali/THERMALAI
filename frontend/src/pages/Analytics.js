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
import {
  FiThermometer,
  FiShield,
  FiBarChart2,
  FiWind,
  FiDownload,
  FiInfo,
  FiActivity,
  FiTrendingUp,
} from "react-icons/fi";

import MetricLineChart from "../components/MetricLineChart";
import AIComparison from "../components/AIComparison";
import ReactorSelector from "../components/ReactorSelector";
import useReactorHistory from "../hooks/useReactorHistory";
import {
  REACTOR_CONFIG,
  RISK_THRESHOLDS,
  getReactorConfig,
} from "../constants/reactors";

const ENGINEERING_INSIGHTS = {
  risk_score:
    "Evaluates multi-variable AI ensemble failure probability. Elevated scores demand immediate thermal jacket inspection and feed stabilization.",
  temperature:
    "Tracks reactor process temperature against exothermic runaway boundaries (Tv vs Tj). Keep delta below 15°C for optimal heat transfer.",
  pressure:
    "Monitors internal vessel pressure (P) correlated with vapor phase temperature. Sudden increases indicate vapor-lock or runaway kinetics.",
  reaction_rate:
    "Monitors conversion progress percentage alongside real-time risk. Sharp acceleration indicates autocatalytic escalation.",
  cooling_efficiency:
    "Correlates coolant mass flow rate against generated heat (Qgen). Low efficiency signals fouling or coolant vapor lock.",
  flow_rate:
    "Tracks reactant feed flow against real-time reactor mass balance to prevent unexpected volumetric expansion.",
  material_level:
    "Monitors vessel liquid inventory against agitator torque requirements. Low level hazards dry-run agitation and thermal hotspotting.",
  gas_concentration:
    "Detects hazardous headspace off-gassing. Spikes trigger automatic nitrogen purge and vent scrubber sequences.",
  ph_level:
    "Tracks acid-base stoichiometry and decomposition off-gassing. Sudden pH shifts indicate unwanted side-reactions or catalyst degradation.",
  emissions_co2_ppm:
    "Monitors carbon dioxide effluent emissions against environmental compliance limit and runaway decomposition rate.",
};

const CORRELATION_MAP = {
  temperature: {
    title: "Vessel Temp (Tv) vs Jacket Temp (Tj)",
    key1: "temperature",
    name1: "Tv (°C)",
    stroke1: "#f97316",
    key2: "cooling_efficiency",
    name2: "Tj (°C equiv)",
    stroke2: "#3b82f6",
  },
  pressure: {
    title: "Pressure (P) vs Vessel Temp (Tv)",
    key1: "pressure",
    name1: "Pressure (bar)",
    stroke1: "#60a5fa",
    key2: "temperature",
    name2: "Tv (°C)",
    stroke2: "#f97316",
  },
  reaction_rate: {
    title: "Reaction Progress (%) vs Risk Score",
    key1: "reaction_rate",
    name1: "Progress (%)",
    stroke1: "#a78bfa",
    key2: "risk_score",
    name2: "Risk Score",
    stroke2: "#ef4444",
  },
  cooling_efficiency: {
    title: "Cooling Flow vs Heat Generated (Qgen)",
    key1: "cooling_efficiency",
    name1: "Cooling Flow",
    stroke1: "#22c55e",
    key2: "temperature",
    name2: "Qgen (kW equiv)",
    stroke2: "#eab308",
  },
  flow_rate: {
    title: "Feed Rate vs Mass Balance",
    key1: "flow_rate",
    name1: "Feed Rate (L/min)",
    stroke1: "#34d399",
    key2: "material_level",
    name2: "Mass Balance (%)",
    stroke2: "#a3e635",
  },
  material_level: {
    title: "Vessel Level vs Agitator Torque",
    key1: "material_level",
    name1: "Level (%)",
    stroke1: "#a3e635",
    key2: "pressure",
    name2: "Torque (Nm equiv)",
    stroke2: "#8b5cf6",
  },
  gas_concentration: {
    title: "Off-gas Concentration vs Headspace Pressure",
    key1: "gas_concentration",
    name1: "Off-gas (ppm)",
    stroke1: "#f87171",
    key2: "pressure",
    name2: "Pressure (bar)",
    stroke2: "#60a5fa",
  },
  ph_level: {
    title: "pH Level vs Reaction Kinetics",
    key1: "ph_level",
    name1: "pH Level",
    stroke1: "#c084fc",
    key2: "reaction_rate",
    name2: "Kinetics (rate)",
    stroke2: "#a78bfa",
  },
  emissions_co2_ppm: {
    title: "CO2 Emissions vs System Risk",
    key1: "emissions_co2_ppm",
    name1: "CO2 (ppm)",
    stroke1: "#94a3b8",
    key2: "risk_score",
    name2: "Risk Score",
    stroke2: "#ef4444",
  },
  risk_score: {
    title: "AI Risk Score vs Process Temperature",
    key1: "risk_score",
    name1: "Risk Score",
    stroke1: "#ef4444",
    key2: "temperature",
    name2: "Temp (°C)",
    stroke2: "#f97316",
  },
};

const WARN = "#f59e0b";
const CRIT = "#ef4444";
const T = RISK_THRESHOLDS;

const SENSOR_TABS = [
  {
    key: "risk_score",
    label: "Risk",
    stroke: "#ef4444",
    domain: [0, 100],
    refs: [
      { y: T.WARNING, label: "warn", color: WARN },
      { y: T.CRITICAL, label: "crit", color: CRIT },
    ],
  },
  {
    key: "temperature",
    label: "Temp",
    stroke: "#f97316",
    domain: [0, 220],
    refs: [{ y: T.TEMP_CRITICAL, label: "crit", color: CRIT }],
  },
  {
    key: "pressure",
    label: "Pressure",
    stroke: "#60a5fa",
    domain: [0, 12],
    refs: [{ y: T.PRESSURE_CRITICAL, label: "warn", color: WARN }],
  },
  {
    key: "reaction_rate",
    label: "Reaction",
    stroke: "#a78bfa",
    domain: [0, 1],
    refs: [
      { y: 0.4, label: "warn", color: WARN },
      { y: 0.7, label: "crit", color: CRIT },
    ],
  },
  {
    key: "cooling_efficiency",
    label: "Cooling",
    stroke: "#22c55e",
    domain: [0, 1],
    refs: [{ y: 0.5, label: "warn", color: WARN }],
  },
  {
    key: "flow_rate",
    label: "Flow",
    stroke: "#34d399",
    domain: [0, 500],
    refs: [
      { y: 10, label: "low", color: WARN },
      { y: 480, label: "high", color: WARN },
    ],
  },
  {
    key: "material_level",
    label: "Level",
    stroke: "#a3e635",
    domain: [0, 100],
    refs: [
      { y: 5, label: "low", color: WARN },
      { y: 95, label: "high", color: WARN },
    ],
  },
  {
    key: "gas_concentration",
    label: "Gas",
    stroke: "#f87171",
    domain: [0, 1000],
    refs: [
      { y: T.GAS_TOXIC, label: "danger", color: WARN },
      { y: T.GAS_ABORT, label: "abort", color: CRIT },
    ],
  },
  {
    key: "ph_level",
    label: "pH",
    stroke: "#c084fc",
    domain: [0, 14],
    refs: [
      { y: T.PH_LOW_DANGER, label: "crit", color: CRIT },
      { y: T.PH_LOW_WARNING, label: "warn", color: WARN },
      { y: T.PH_HIGH_WARNING, label: "warn", color: WARN },
      { y: T.PH_HIGH_DANGER, label: "crit", color: CRIT },
    ],
  },
  {
    key: "emissions_co2_ppm",
    label: "CO₂",
    stroke: "#94a3b8",
    domain: [0, 5000],
    refs: [
      { y: T.CO2_WARNING, label: "warn", color: WARN },
      { y: T.CO2_CRITICAL, label: "crit", color: CRIT },
    ],
  },
];

const RANGES = {
  "30m": 30,
  "2h": 2 * 60,
  "8h": 8 * 60,
  "24h": 24 * 60,
};

const formatHistory = (d, i) => ({
  ...d,
  time: d.timestamp ? new Date(d.timestamp).toLocaleTimeString() : `${i}s`,
  index: i,
});

function Analytics() {
  const { id } = useParams();
  const [selectedReactor, setSelectedReactor] = useState(id || "R-101");
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
  const featured =
    SENSOR_TABS.find((tab) => tab.key === activeSensor) || SENSOR_TABS[0];
  const currentCorr =
    CORRELATION_MAP[activeSensor] || CORRELATION_MAP.temperature;

  const cutoffMs = Date.now() - (RANGES[range] || 120) * 60000;
  const filtered = (history || []).filter((d) => {
    const timestamp = new Date(d.timestamp).getTime();
    return Number.isNaN(timestamp) || timestamp >= cutoffMs;
  });

  const latestReading = filtered.length ? filtered[filtered.length - 1] : null;

  // Calculate KPI Band Statistics over selected window
  const getKpiStats = () => {
    if (!filtered || filtered.length === 0)
      return { current: "0.0", peak: "0.0", stdDev: "0.00", safetyMargin: "0.0" };
    const values = filtered.map((d) => Number(d[activeSensor]) || 0);
    const current = values[values.length - 1];
    const peak = Math.max(...values);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    const threshold = featured?.refs?.[0]?.y || 100;
    const safetyMargin = threshold - current;

    return {
      current: current.toFixed(1),
      peak: peak.toFixed(1),
      stdDev: stdDev.toFixed(2),
      safetyMargin: safetyMargin.toFixed(1),
    };
  };

  const kpiStats = getKpiStats();

  const exportCsv = () => {
    const cols = [
      "timestamp",
      "temperature",
      "pressure",
      "reaction_rate",
      "cooling_efficiency",
      "flow_rate",
      "material_level",
      "gas_concentration",
      "ph_level",
      "emissions_co2_ppm",
      "risk_score",
      "status",
    ];

    const header = cols.join(",");
    const rows = filtered.map((d) =>
      cols.map((column) => d[column] ?? "").join(",")
    );
    const csv = [header, ...rows].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${selectedReactor}_history_${range}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      {/* Top Reactor Selector Buttons */}
      <div
        className="flex items-center gap-2 mb-6 p-2 rounded-xl overflow-x-auto"
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
        }}
      >
        <span
          className="text-xs font-bold uppercase tracking-wider px-3 whitespace-nowrap"
          style={{ color: "var(--text-sub)" }}
        >
          Select Reactor:
        </span>
        {reactorIds.map((rId) => (
          <button
            key={rId}
            onClick={() => setSelectedReactor(rId)}
            className="text-xs font-bold px-4 py-2 rounded-lg transition-all whitespace-nowrap"
            style={{
              backgroundColor:
                selectedReactor === rId ? "var(--accent)" : "transparent",
              color: selectedReactor === rId ? "#fff" : "var(--text-sub)",
              border:
                selectedReactor === rId ? "none" : "1px solid var(--border)",
            }}
          >
            {rId}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: "var(--text)" }}>
            Viewing {config.tag} — {config.name}
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text-sub)" }}>
            Historical trends and multi-parameter analysis ({config.plant_name})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div
            className="flex gap-1 p-1 rounded-lg"
            style={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
            }}
          >
            {Object.keys(RANGES).map((rangeKey) => (
              <button
                key={rangeKey}
                onClick={() => setRange(rangeKey)}
                className="text-[11px] font-bold px-3 py-1.5 rounded-md transition-colors"
                style={{
                  backgroundColor:
                    range === rangeKey ? "var(--accent)" : "transparent",
                  color: range === rangeKey ? "#fff" : "var(--text-sub)",
                }}
              >
                {rangeKey}
              </button>
            ))}
          </div>

          <button
            onClick={exportCsv}
            disabled={filtered.length === 0}
            className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
            style={{
              backgroundColor: "var(--accent)",
              color: "#fff",
              opacity: filtered.length === 0 ? 0.5 : 1,
            }}
          >
            <FiDownload aria-hidden="true" />
            Export Telemetry CSV
          </button>

          <ReactorSelector
            reactorIds={reactorIds}
            selected={selectedReactor}
            onSelect={setSelectedReactor}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {SENSOR_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSensor(tab.key)}
            className="text-sm font-semibold px-4 py-1.5 rounded-full transition-colors"
            style={{
              backgroundColor:
                activeSensor === tab.key ? "var(--accent)" : "var(--card)",
              color: activeSensor === tab.key ? "#fff" : "var(--text-sub)",
              border: `1px solid ${
                activeSensor === tab.key ? "var(--accent)" : "var(--border)"
              }`,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div
          className="rounded-xl p-16 text-center"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}
        >
          <p className="text-xl font-semibold" style={{ color: "var(--text-sub)" }}>
            No history available yet for {selectedReactor}
          </p>
          <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
            Start the python telemetry stream to view trend telemetry (`python stream_data.py`)
          </p>
        </div>
      ) : (
        <div>
          {/* Top KPI Metrics Summary Band */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div
              className="p-4 rounded-xl"
              style={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                className="flex items-center gap-2 text-xs font-semibold uppercase"
                style={{ color: "var(--text-sub)" }}
              >
                <FiActivity /> Current & Peak Value ({featured.label})
              </div>
              <div
                className="text-2xl font-bold mt-2"
                style={{ color: "var(--text)" }}
              >
                {kpiStats.current}{" "}
                <span className="text-xs text-emerald-500 font-normal">
                  (Peak: {kpiStats.peak})
                </span>
              </div>
            </div>

            <div
              className="p-4 rounded-xl"
              style={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                className="flex items-center gap-2 text-xs font-semibold uppercase"
                style={{ color: "var(--text-sub)" }}
              >
                <FiTrendingUp /> Volatility (Std Dev)
              </div>
              <div
                className="text-2xl font-bold mt-2"
                style={{ color: "var(--text)" }}
              >
                ±{kpiStats.stdDev}
              </div>
            </div>

            <div
              className="p-4 rounded-xl"
              style={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
              }}
            >
              <div
                className="flex items-center gap-2 text-xs font-semibold uppercase"
                style={{ color: "var(--text-sub)" }}
              >
                <FiShield /> Margin to Safety Threshold
              </div>
              <div
                className="text-2xl font-bold mt-2"
                style={{
                  color:
                    Number(kpiStats.safetyMargin) < 5 ? "#ef4444" : "#22c55e",
                }}
              >
                {Number(kpiStats.safetyMargin) > 0
                  ? `+${kpiStats.safetyMargin}`
                  : kpiStats.safetyMargin}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <AIComparison reactor={latestReading} />
          </div>

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

          <div
            className="mb-6 p-6 rounded-xl"
            style={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
            }}
          >
            <h3 className="font-semibold mb-1" style={{ color: "var(--text)" }}>
              {currentCorr.title}
            </h3>
            <p className="text-sm mb-4" style={{ color: "var(--text-sub)" }}>
              Multi-parameter process correlation over the active window
            </p>

            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={filtered}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="time"
                  stroke="var(--text-muted)"
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  yAxisId="left"
                  stroke={currentCorr.stroke1}
                  tick={{ fontSize: 10 }}
                  label={{
                    value: currentCorr.name1,
                    angle: -90,
                    position: "insideLeft",
                    fill: currentCorr.stroke1,
                    fontSize: 10,
                  }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke={currentCorr.stroke2}
                  tick={{ fontSize: 10 }}
                  label={{
                    value: currentCorr.name2,
                    angle: 90,
                    position: "insideRight",
                    fill: currentCorr.stroke2,
                    fontSize: 10,
                  }}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey={currentCorr.key1}
                  name={currentCorr.name1}
                  stroke={currentCorr.stroke1}
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey={currentCorr.key2}
                  name={currentCorr.name2}
                  stroke={currentCorr.stroke2}
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div
            className="mb-6 p-5 rounded-xl flex items-start gap-3"
            style={{
              backgroundColor: "rgba(59, 130, 246, 0.08)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
            }}
          >
            <FiInfo className="text-blue-500 text-xl flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-blue-500 uppercase tracking-wider mb-1">
                Engineering Insight & Process Guidance ({featured.label})
              </h4>
              <p className="text-sm text-slate-300">
                {ENGINEERING_INSIGHTS[activeSensor] ||
                  ENGINEERING_INSIGHTS.temperature}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <MetricLineChart
              data={filtered}
              dataKey="temperature"
              stroke="#f97316"
              title={
                <span className="inline-flex items-center gap-2">
                  <FiThermometer aria-hidden="true" /> Temperature History
                </span>
              }
              titleClassName="font-semibold mb-4"
              tickFontSize={9}
            />
            <MetricLineChart
              data={filtered}
              dataKey="risk_score"
              stroke="#ef4444"
              title={
                <span className="inline-flex items-center gap-2">
                  <FiShield aria-hidden="true" /> AI Risk Score History
                </span>
              }
              titleClassName="font-semibold mb-4"
              tickFontSize={9}
              domain={[0, 100]}
            />
            <MetricLineChart
              data={filtered}
              dataKey="pressure"
              stroke="#60a5fa"
              title={
                <span className="inline-flex items-center gap-2">
                  <FiBarChart2 aria-hidden="true" /> Pressure History
                </span>
              }
              titleClassName="font-semibold mb-4"
              tickFontSize={9}
            />
            <MetricLineChart
              data={filtered}
              dataKey="cooling_efficiency"
              stroke="#22c55e"
              title={
                <span className="inline-flex items-center gap-2">
                  <FiWind aria-hidden="true" /> Cooling Efficiency History
                </span>
              }
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