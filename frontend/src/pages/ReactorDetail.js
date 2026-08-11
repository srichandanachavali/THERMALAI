import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import ExplainPanel from "../components/ExplainPanel";
import CountdownTimer from "../components/CountdownTimer";
import AIComparison from "../components/AIComparison";
import MaintenancePanel from "../components/MaintenancePanel";
import ReactorStatePanel from "../components/ReactorStatePanel";
import SensorTicker from "../components/SensorTicker";
import SensorReadingTable from "../components/SensorReadingTable";
import DataQualityIndicator from "../components/DataQualityIndicator";
import { simulateRunaway } from "../services/api";
import { REACTOR_CONFIG, getReactorConfig } from "../constants/reactors";
import useReactorHistory from "../hooks/useReactorHistory";

// Process → pill color (ISA S5.1 tag families)
const processColor = (process) => {
  const p = (process || "").toLowerCase();
  if (p.includes("nitration")) return "#f97316"; // orange
  if (p.includes("hydrogen")) return "#3b82f6"; // blue
  if (p.includes("polymer")) return "#a855f7"; // purple
  return "var(--text-sub)";
};

function ReactorDetail() {
  const { id } = useParams();
  const reactorId = id || "R-101";
  const navigate = useNavigate();
  const { reactors } = useSocket();
  let user = {};
  try {
    user = JSON.parse(localStorage.getItem("thermalai_user") || "{}");
  } catch {
    user = {};
  }

  const reactor = reactors.find((r) => r.reactor_id === reactorId);
  const config = getReactorConfig(reactorId);
  const { history } = useReactorHistory(reactorId, { liveReactor: reactor });
  const reactorIds = Object.keys(REACTOR_CONFIG);

  if (!reactor) {
    return (
      <div>
        {/* Reactor Switcher Bar */}
        <div
          className="flex items-center gap-2 mb-6 p-2 rounded-xl"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
          }}
        >
          <span
            className="text-xs font-bold uppercase tracking-wider px-3"
            style={{ color: "var(--text-sub)" }}
          >
            Select Reactor:
          </span>
          {reactorIds.map((rId) => (
            <button
              key={rId}
              onClick={() => navigate(`/reactor/${rId}`)}
              className="text-xs font-bold px-4 py-2 rounded-lg transition-all"
              style={{
                backgroundColor:
                  reactorId === rId ? "var(--accent)" : "transparent",
                color: reactorId === rId ? "#fff" : "var(--text-sub)",
                border:
                  reactorId === rId ? "none" : "1px solid var(--border)",
              }}
            >
              {rId}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-xl" style={{ color: "var(--text-sub)" }}>
              Waiting for {config.tag} telemetry data...
            </p>
            <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
              Ensure backend server and data streamer are active.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Reactor Switcher Bar */}
      <div
        className="flex items-center gap-2 mb-6 p-2 rounded-xl"
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
        }}
      >
        <span
          className="text-xs font-bold uppercase tracking-wider px-3"
          style={{ color: "var(--text-sub)" }}
        >
          Select Reactor:
        </span>
        {reactorIds.map((rId) => (
          <button
            key={rId}
            onClick={() => navigate(`/reactor/${rId}`)}
            className="text-xs font-bold px-4 py-2 rounded-lg transition-all"
            style={{
              backgroundColor:
                reactorId === rId ? "var(--accent)" : "transparent",
              color: reactorId === rId ? "#fff" : "var(--text-sub)",
              border:
                reactorId === rId ? "none" : "1px solid var(--border)",
            }}
          >
            {rId}
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => navigate("/")}
            className="mb-2 flex items-center gap-2 text-sm font-semibold hover:underline"
            style={{ color: "var(--text-sub)" }}
          >
            ← Back to Overview
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold" style={{ color: "var(--text)" }}>
              {config.tag} — {config.name}
            </h1>
            <span
              className="text-[11px] font-bold px-3 py-1 rounded-full"
              style={{
                backgroundColor: processColor(config.process),
                color: "#fff",
              }}
            >
              {config.process}
            </span>
          </div>
          <p className="mt-1 text-sm" style={{ color: "var(--text-sub)" }}>
            {config.plant_name} · {config.location}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/analytics/${reactorId}`)}
            className="bg-blue-700 hover:bg-blue-600 font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
            style={{ color: "#fff" }}
          >
            View Analytics & Trends
          </button>

          {/* Admin only simulate runaway button */}
          {user.role === "admin" && (
            <button
              onClick={async () => {
                try {
                  await simulateRunaway(reactorId);
                } catch {
                  // silent handling — alerts broadcast over websocket
                }
              }}
              className="bg-red-700 hover:bg-red-600 font-semibold px-4 py-2 rounded-lg transition-colors text-sm"
              style={{ color: "#fff" }}
            >
              Simulate Runaway
            </button>
          )}
        </div>
      </div>

      {/* Two-column cockpit layout */}
      <div className="grid grid-cols-5 gap-6 mb-8">
        <ReactorStatePanel reactor={reactor} config={config} />

        {/* Right Column (60%) */}
        <div className="col-span-5 lg:col-span-3 space-y-6">
          <CountdownTimer reactor={reactor} />
          <SensorTicker reactor={reactor} />

          {/* Data Quality Indicator */}
          <div className="flex items-center gap-3 mt-2">
            <DataQualityIndicator
              quality={reactor.data_quality}
              sensorValidation={reactor.sensor_validation}
            />
          </div>

          <ExplainPanel reactor={reactor} />
        </div>
      </div>

      {/* Full-width section: AI model comparison, maintenance, sensor readings */}
      <div className="space-y-6">
        <AIComparison reactor={reactor} />
        <MaintenancePanel reactor={reactor} />

        {/* Sensor Reading Table — Last 10 readings */}
        <div
          className="p-5"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-4"
            style={{ color: "var(--text-sub)" }}
          >
            Recent Sensor Readings (Last 10)
          </p>
          <div style={{ overflowX: "auto" }}>
            <SensorReadingTable readings={history} reactor={reactor} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReactorDetail;