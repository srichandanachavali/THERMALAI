import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FiCheckCircle, FiXCircle, FiAlertTriangle } from "react-icons/fi";
import { useSocket } from "../context/SocketContext";
import RiskGauge from "../components/RiskGauge";
import StatusBadge from "../components/StatusBadge";
import ExplainPanel from "../components/ExplainPanel";
import CountdownTimer from "../components/CountdownTimer";
import AIComparison from "../components/AIComparison";
import PredictionTimeline from "../components/PredictionTimeline";
import MaintenancePanel from "../components/MaintenancePanel";
import ReactorHeatmap from "../components/ReactorHeatmap";
import { simulateRunaway } from "../services/api";
import { getReactorConfig, RISK_THRESHOLDS } from "../constants/reactors";

// Process → pill color (ISA S5.1 tag families).
const processColor = (process) => {
  const p = (process || "").toLowerCase();
  if (p.includes("nitration")) return "#f97316"; // orange
  if (p.includes("hydrogen")) return "#3b82f6"; // blue
  if (p.includes("polymer")) return "#a855f7"; // purple
  return "var(--textSub)";
};

const confidenceStyle = (level) => {
  if (level === "HIGH") return { color: "var(--success)", Icon: FiCheckCircle };
  if (level === "LOW") return { color: "var(--danger)", Icon: FiXCircle };
  return { color: "var(--warning)", Icon: FiAlertTriangle };
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

  // Model confidence + RF/LSTM weighting (TRL-5 differentiator). Backend ships
  // lstm_confidence (0-100) today; confidence/weights fall back to derived or
  // the fixed 40/60 backend blend when not yet plumbed through.
  const confidence =
    reactor.confidence ||
    (reactor.lstm_confidence != null
      ? reactor.lstm_confidence > 70
        ? "HIGH"
        : reactor.lstm_confidence > 50
          ? "MEDIUM"
          : "LOW"
      : "MEDIUM");
  const rfW = reactor.rf_weight_used ?? 40;
  const lstmW = reactor.lstm_weight_used ?? 60;
  const conf = confidenceStyle(confidence);
  const ConfIcon = conf.Icon;

  // Physics context — margin to runaway.
  const margin = config.runaway_temp - (reactor.temperature || 0);
  const marginColor = margin > 30 ? "var(--success)" : margin >= 10 ? "var(--warning)" : "var(--danger)";

  const paramAlerts = reactor.parameter_alerts || [];

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
        {/* Left column (40%) */}
        <div className="col-span-5 lg:col-span-2 space-y-6">
          <div
            className="p-5"
            style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}
          >
            <RiskGauge
              score={reactor.risk_score || 0}
              status={reactor.status || "SAFE"}
            />
            {/* Confidence indicator */}
            <div className="mt-4 text-center">
              <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--textMuted)" }}>
                Model confidence
              </p>
              <p className="flex items-center justify-center gap-1.5 text-lg font-bold mt-1" style={{ color: conf.color }}>
                <ConfIcon aria-hidden="true" />
                {confidence}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--textSub)" }}>
                RF {rfW}% + LSTM {lstmW}% weighted
              </p>
            </div>
          </div>

          {/* Physics context */}
          <div
            className="p-5"
            style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}
          >
            <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--textSub)" }}>
              Physics Context
            </p>
            <p className="text-sm" style={{ color: "var(--text)" }}>
              Runaway threshold: <span className="font-bold">{config.runaway_temp}°C</span> /{" "}
              <span className="font-bold">{config.runaway_pressure} bar</span>
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--text)" }}>
              Current margin:{" "}
              <span className="font-bold" style={{ color: marginColor }}>
                {margin.toFixed(1)}°C
              </span>{" "}
              to runaway
            </p>
          </div>

          {/* Active parameter alerts */}
          {paramAlerts.length > 0 && (
            <div
              className="p-5"
              style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderLeft: "3px solid var(--danger)", borderRadius: 12 }}
            >
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--danger)" }}>
                Active Parameter Alerts
              </p>
              <div className="space-y-3">
                {paramAlerts.map((p, i) => (
                  <div key={i} className="text-sm" style={{ color: "var(--text)" }}>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        {p.param.replace(/_/g, " ")}
                      </span>
                      <StatusBadge status={p.severity} />
                    </div>
                    <p className="text-xs mt-1" style={{ color: "var(--textSub)" }}>
                      {p.reason} ({p.value})
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column (60%) */}
        <div className="col-span-5 lg:col-span-3 space-y-6">
          <CountdownTimer reactor={reactor} />

          {/* Live sensor ticker */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              { label: "Temperature", value: `${reactor.temperature ?? "—"}°C`, num: reactor.temperature ?? 0, min: 0, max: 220, color: (reactor.temperature || 0) > RISK_THRESHOLDS.TEMP_CRITICAL ? "var(--danger)" : "var(--text)", arrow: (reactor.temp_rate_of_change || 0) > 0 ? "▲" : (reactor.temp_rate_of_change || 0) < 0 ? "▼" : "", level: (reactor.temperature || 0) > RISK_THRESHOLDS.TEMP_CRITICAL ? "critical" : "safe" },
              { label: "Pressure", value: `${reactor.pressure ?? "—"} bar`, num: reactor.pressure ?? 0, min: 0, max: 12, color: (reactor.pressure || 0) > RISK_THRESHOLDS.PRESSURE_CRITICAL ? "var(--danger)" : "var(--text)", level: (reactor.pressure || 0) > RISK_THRESHOLDS.PRESSURE_CRITICAL ? "critical" : "safe" },
              { label: "Cooling", value: `${Math.round((reactor.cooling_efficiency || 0) * 100)}%`, num: Math.round((reactor.cooling_efficiency || 0) * 100), min: 0, max: 100, color: (reactor.cooling_efficiency || 0) < 0.3 ? "var(--danger)" : "var(--text)", level: (reactor.cooling_efficiency || 0) < 0.3 ? "critical" : "safe" },
              { label: "Reaction Rate", value: reactor.reaction_rate ?? "—", num: reactor.reaction_rate ?? 0, min: 0, max: 1, color: "var(--text)", level: (reactor.reaction_rate || 0) >= 0.7 ? "critical" : "safe" },
              { label: "ΔTemp/Cycle", value: `${reactor.temp_rate_of_change ?? 0}°C`, num: reactor.temp_rate_of_change ?? 0, min: -20, max: 20, color: (reactor.temp_rate_of_change || 0) > 5 ? "var(--danger)" : "var(--text)", level: (reactor.temp_rate_of_change || 0) > 5 ? "critical" : "safe" },
              { label: "Risk", value: `${reactor.risk_score ?? 0}%`, num: reactor.risk_score ?? 0, min: 0, max: 100, color: (reactor.risk_score || 0) >= RISK_THRESHOLDS.CRITICAL ? "var(--danger)" : (reactor.risk_score || 0) >= RISK_THRESHOLDS.WARNING ? "var(--warning)" : "var(--success)", level: (reactor.risk_score || 0) >= RISK_THRESHOLDS.CRITICAL ? "critical" : (reactor.risk_score || 0) >= RISK_THRESHOLDS.WARNING ? "warning" : "safe" },
            ].map((s) => (
              <div
                key={s.label}
                role="meter"
                aria-label={`${s.label}: ${s.value}`}
                aria-valuenow={s.num}
                aria-valuemin={s.min}
                aria-valuemax={s.max}
                title={`${s.label}: ${s.value} — ${s.level}`}
                className="p-3"
                style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 10 }}
              >
                <p className="text-[10px] uppercase tracking-wider" style={{ color: "var(--textMuted)" }}>
                  {s.label}
                </p>
                <p className="text-lg font-bold mt-1 tabular-nums" style={{ color: s.color }}>
                  {s.value} {s.arrow && <span className="text-xs" aria-hidden="true">{s.arrow}</span>}
                </p>
              </div>
            ))}
          </div>

          <ExplainPanel reactor={reactor} />
        </div>
      </div>

      {/* Full-width: model comparison, prediction, maintenance, plant floor context */}
      <div className="space-y-6">
        <AIComparison reactor={reactor} />
        <PredictionTimeline reactor={reactor} />
        <MaintenancePanel reactor={reactor} />
        <ReactorHeatmap reactors={reactors} />
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
