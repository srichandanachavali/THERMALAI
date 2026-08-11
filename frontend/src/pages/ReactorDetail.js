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

// Process → pill color (ISA S5.1 tag families).
const processColor = (process) => {
  const p = (process || "").toLowerCase();
  if (p.includes("nitration")) return "#f97316"; // orange
  if (p.includes("hydrogen")) return "#3b82f6"; // blue
  if (p.includes("polymer")) return "#a855f7"; // purple
  return "var(--textSub)";
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

  if (!reactor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-400 text-xl">
            Waiting for {config.tag} data...
          </p>
          <p className="text-gray-500 text-sm mt-2">
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
            className="text-gray-400 hover:text-white mb-2 flex items-center gap-2"
          >
            ← Back to Overview
          </button>
          <h1 className="text-3xl font-bold text-white">
            {config.tag} — {config.name}
          </h1>
          <p className="text-gray-400 mt-1">
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
            className="bg-red-700 hover:bg-red-600 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm"
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
            <DataQualityIndicator reading={reactor} compact />
          </div>

          <ExplainPanel reactor={reactor} />
        </div>
      </div>

      {/* Full-width: model comparison, prediction, maintenance */}
      <div className="space-y-6">
        <AIComparison reactor={reactor} />
        <MaintenancePanel reactor={reactor} />

        {/* Sensor Reading Table — last reading with data quality */}
        <div
          className="p-5"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--textSub)" }}>
            Recent Sensor Readings (Last 10)
          </p>
          <div style={{ overflowX: 'auto' }}>
            <SensorReadingTable reactor={reactor} />
          </div>
        </div>
      </div>

      <div className="flex justify-end mt-6">
        <button
          onClick={() => navigate(`/analytics/${reactorId}`)}
          className="bg-blue-700 hover:bg-blue-600 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm"
        >
          View Full History
        </button>
      </div>
    </div>
  );
}

export default ReactorDetail;
