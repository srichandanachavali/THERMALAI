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
import { getReactorConfig } from "../constants/reactors";
import useReactorHistory from "../hooks/useReactorHistory";

// Process → pill color (ISA S5.1 tag families).
const processColor = (process) => {
  const p = (process || "").toLowerCase();
  if (p.includes("nitration")) return "#f97316"; // orange
  if (p.includes("hydrogen")) return "#3b82f6"; // blue
  if (p.includes("polymer")) return "#a855f7"; // purple
  return "var(--text-sub)";
};

function ReactorDetail() {
  const { id } = useParams();
  const reactorId = id ? id.split(":")[0] : id;
  const navigate = useNavigate();
  const { reactors } = useSocket();
  let user = {};
  try { user = JSON.parse(localStorage.getItem("thermalai_user") || "{}"); } catch { user = {}; }

  const reactor = reactors.find((r) => r.reactor_id === reactorId);
  const config = getReactorConfig(reactorId);
  const { history } = useReactorHistory(reactorId, { liveReactor: reactor });

  if (!reactor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-xl" style={{ color: "var(--text-sub)" }}>
            Waiting for {config.tag} data...
          </p>
          <p className="text-sm mt-2" style={{ color: "var(--text-muted)" }}>
            Make sure the data stream is running
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <button
            onClick={() => navigate("/")}
            className="mb-2 flex items-center gap-2"
            style={{ color: "var(--text-sub)" }}
          >
            ← Back to Overview
          </button>
          <h1 className="text-3xl font-bold" style={{ color: "var(--text)" }}>
            {config.tag} — {config.name}
          </h1>
          <p className="mt-1" style={{ color: "var(--text-sub)" }}>
            {config.process} · {config.plant_name} · {config.location}
          </p>
          <span
            className="inline-block text-[11px] font-bold px-3 py-1 rounded-full mt-2"
            style={{ backgroundColor: processColor(config.process), color: "#fff" }}
          >
            {config.process}
          </span>
        </div>

        {/* Admin only simulate button */}
        {user.role === "admin" && (
          <button
            onClick={async () => {
              try {
                await simulateRunaway(reactorId);
              } catch {
                // simulation error handled silently — alert will appear via socket
              }
            }}
            className="bg-red-700 hover:bg-red-600 font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm"
            style={{ color: "var(--text)" }}
          >
            Simulate Runaway
          </button>
        )}
      </div>

      {/* Two-column cockpit: left = state/context, right = live + explanation */}
      <div className="grid grid-cols-5 gap-6 mb-8">
        <ReactorStatePanel reactor={reactor} config={config} />

        {/* Right column (60%) */}
        <div className="col-span-5 lg:col-span-3 space-y-6">
          <CountdownTimer reactor={reactor} />
          <SensorTicker reactor={reactor} />

          {/* Data Quality Indicator near sensor ticker */}
          <div className="flex items-center gap-3 mt-2">
            <DataQualityIndicator
              quality={reactor.data_quality}
              sensorValidation={reactor.sensor_validation}
            />
          </div>

          <ExplainPanel reactor={reactor} />
        </div>
      </div>

      {/* Full-width: model comparison, prediction, maintenance */}
      <div className="space-y-6">
        <AIComparison reactor={reactor} />
        <MaintenancePanel reactor={reactor} />

        {/* Sensor Reading Table — last 10 readings with HMI status accent */}
        <div
          className="p-5"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--text-sub)" }}>
            Recent Sensor Readings (Last 10)
          </p>
          <div style={{ overflowX: 'auto' }}>
            <SensorReadingTable readings={history} reactor={reactor} />
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <button
          onClick={() => navigate(`/analytics/${reactorId}`)}
          className="bg-blue-700 hover:bg-blue-600 font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm"
          style={{ color: "var(--text)" }}
        >
          View Full History
        </button>
      </div>
    </div>
  );
}

export default ReactorDetail;
