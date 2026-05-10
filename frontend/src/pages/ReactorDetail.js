import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import RiskGauge from "../components/RiskGauge";
import ExplainPanel from "../components/ExplainPanel";
import CountdownTimer from "../components/CountdownTimer";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { getReactorHistory } from "../services/api";
import AIComparison from "../components/AIComparison";
import PredictionTimeline from "../components/PredictionTimeline";

function ReactorDetail() {
  const { id } = useParams();
  const reactorId = id ? id.split(":")[0] : id;
  const navigate = useNavigate();
  const { reactors } = useSocket();
  const [history, setHistory] = useState([]);
  const user = JSON.parse(localStorage.getItem("thermalai_user") || "{}");

  const reactor = reactors.find((r) => r.reactor_id === reactorId);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await getReactorHistory(reactorId);
        setHistory(data.reverse());
      } catch (err) {
        console.log("History not available yet");
      }
    };
    fetchHistory();
  }, [reactorId]);

  useEffect(() => {
    if (reactor) {
      setHistory((prev) => {
        const updated = [
          ...prev,
          {
            ...reactor,
            time: new Date().toLocaleTimeString(),
          },
        ];
        return updated.slice(-20);
      });
    }
  }, [reactor]);

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
                const response = await fetch(
                  `http://localhost:5000/api/simulate/${reactorId}`,
                  { method: "POST" },
                );
                const data = await response.json();
                console.log("Simulation triggered:", data);
              } catch (err) {
                console.log("Simulation error:", err);
              }
            }}
            className="bg-red-600 hover:bg-red-500 text-white font-bold px-6 py-3 rounded-lg transition-all animate-pulse"
          >
            🔥 Simulate Runaway
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

        <div className="col-span-2 grid grid-cols-2 gap-4">
          <div className="bg-gray-800 rounded-lg p-6">
            <p className="text-gray-400 text-sm uppercase tracking-wide">
              Temperature
            </p>
            <p className="text-4xl font-bold text-orange-400 mt-2">
              {reactor.temperature}°C
            </p>
            <p className="text-gray-500 text-sm mt-1">Current reading</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <p className="text-gray-400 text-sm uppercase tracking-wide">
              Pressure
            </p>
            <p className="text-4xl font-bold text-blue-400 mt-2">
              {reactor.pressure} bar
            </p>
            <p className="text-gray-500 text-sm mt-1">Current reading</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <p className="text-gray-400 text-sm uppercase tracking-wide">
              Reaction Rate
            </p>
            <p className="text-4xl font-bold text-purple-400 mt-2">
              {reactor.reaction_rate}
            </p>
            <p className="text-gray-500 text-sm mt-1">Current reading</p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <p className="text-gray-400 text-sm uppercase tracking-wide">
              Cooling Efficiency
            </p>
            <p
              className={`text-4xl font-bold mt-2 ${
                reactor.cooling_efficiency > 0.7
                  ? "text-green-400"
                  : reactor.cooling_efficiency > 0.4
                    ? "text-yellow-400"
                    : "text-red-400"
              }`}
            >
              {(reactor.cooling_efficiency * 100).toFixed(0)}%
            </p>
            <p className="text-gray-500 text-sm mt-1">Cooling system</p>
          </div>
        </div>
      </div>

      {/* Live Charts */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-white font-semibold mb-4">
            🌡️ Temperature (°C) — Live
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 10 }} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  background: "#1f2937",
                  border: "none",
                  color: "white",
                }}
              />
              <Line
                type="monotone"
                dataKey="temperature"
                stroke="#f97316"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-white font-semibold mb-4">
            💨 Pressure (bar) — Live
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 10 }} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{
                  background: "#1f2937",
                  border: "none",
                  color: "white",
                }}
              />
              <Line
                type="monotone"
                dataKey="pressure"
                stroke="#60a5fa"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-white font-semibold mb-4">
            🤖 AI Risk Score — Live
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 10 }} />
              <YAxis
                stroke="#6b7280"
                tick={{ fontSize: 10 }}
                domain={[0, 100]}
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
                dataKey="risk_score"
                stroke="#ef4444"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-white font-semibold mb-4">
            ❄️ Cooling Efficiency — Live
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={history}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 10 }} />
              <YAxis stroke="#6b7280" tick={{ fontSize: 10 }} domain={[0, 1]} />
              <Tooltip
                contentStyle={{
                  background: "#1f2937",
                  border: "none",
                  color: "white",
                }}
              />
              <Line
                type="monotone"
                dataKey="cooling_efficiency"
                stroke="#22c55e"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
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

      {/* View Analytics Button */}
      <div className="flex justify-end">
        <button
          onClick={() => navigate(`/analytics/${reactorId}`)}
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-6 py-3 rounded-lg transition-all"
        >
          📊 View Full History →
        </button>
      </div>
    </div>
  );
}

export default ReactorDetail;
