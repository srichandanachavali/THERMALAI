import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import RiskGauge from "../components/RiskGauge";
import ExplainPanel from "../components/ExplainPanel";
import CountdownTimer from "../components/CountdownTimer";
import MetricLineChart from "../components/MetricLineChart";
import ReactorStats from "../components/ReactorStats";
import { simulateRunaway } from "../services/api";
import AIComparison from "../components/AIComparison";
import PredictionTimeline from "../components/PredictionTimeline";
import MaintenancePanel from "../components/MaintenancePanel";
import useReactorHistory from "../hooks/useReactorHistory";

function ReactorDetail() {
  const { id } = useParams();
  const reactorId = id ? id.split(":")[0] : id;
  const navigate = useNavigate();
  const { reactors } = useSocket();
  const user = JSON.parse(localStorage.getItem("thermalai_user") || "{}");

  const reactor = reactors.find((r) => r.reactor_id === reactorId);
  const { history } = useReactorHistory(reactorId, {
    liveReactor: reactor,
    maxPoints: 20,
  });

  if (!reactor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-400 text-xl">
            Waiting for Reactor {reactorId} data...
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
            Reactor {reactorId} — Live Monitor
          </h1>
          <p className="text-gray-400 mt-1">
            Real-time sensor readings + AI prediction
          </p>
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

      {/* Countdown Timer */}
      <div className="mb-6">
        <CountdownTimer reactor={reactor} />
      </div>

      {/* Top Row — Gauge + Current Stats */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800 rounded-lg col-span-1">
          <RiskGauge
            score={reactor.risk_score || 0}
            status={reactor.status || "SAFE"}
          />
        </div>

        <ReactorStats reactor={reactor} />
      </div>

      {/* Live Charts */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <MetricLineChart
          data={history}
          dataKey="temperature"
          stroke="#f97316"
          title="Temperature (°C)"
        />
        <MetricLineChart
          data={history}
          dataKey="pressure"
          stroke="#60a5fa"
          title="Pressure (bar)"
        />
        <MetricLineChart
          data={history}
          dataKey="risk_score"
          stroke="#ef4444"
          title="AI Risk Score"
          domain={[0, 100]}
        />
        <MetricLineChart
          data={history}
          dataKey="cooling_efficiency"
          stroke="#22c55e"
          title="Cooling Efficiency"
          domain={[0, 1]}
        />
      </div>

      {/* AI Model Comparison */}
      <div className="mb-8">
        <AIComparison reactor={reactor} />
      </div>

      {/* LSTM Prediction Timeline */}
      <div className="mb-8">
        <PredictionTimeline reactor={reactor} />
      </div>

      {/* AI Explanation Panel */}
      <div className="mb-8">
        <ExplainPanel reactor={reactor} />
      </div>
      {/* Predictive Maintenance */}
      <div className="mb-8">
        <MaintenancePanel reactor={reactor} />
      </div>

      <div className="flex justify-end">
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
