import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import { getReactorHistory } from "../services/api";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";

function Analytics() {
  const { id } = useParams();
  const { reactors } = useSocket();
  const [history, setHistory] = useState([]);
  const [selectedReactor, setSelectedReactor] = useState(id || "A");

  useEffect(() => {
    if (id) setSelectedReactor(id);
  }, [id]);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const data = await getReactorHistory(selectedReactor);
        const formatted = data.reverse().map((d, i) => ({
          ...d,
          time: new Date(d.timestamp).toLocaleTimeString(),
          index: i,
        }));
        setHistory(formatted);
      } catch (err) {
        console.log("History not available");
      }
    };
    fetchHistory();
  }, [selectedReactor]);

  const reactorIds = ["A", "B", "C", "D", "E"];

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
        <div className="flex gap-2">
          {reactorIds.map((rid) => (
            <button
              key={rid}
              onClick={() => setSelectedReactor(rid)}
              className={`px-4 py-2 rounded-lg font-bold transition-all ${
                selectedReactor === rid
                  ? "bg-green-500 text-white"
                  : "bg-gray-700 text-gray-400 hover:bg-gray-600"
              }`}
            >
              {rid}
            </button>
          ))}
        </div>
      </div>

      {/* Current Status */}
      {reactors.find((r) => r.reactor_id === selectedReactor) && (
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <h3 className="text-white font-semibold mb-3">
            Reactor {selectedReactor} — Current Status
          </h3>
          <div className="grid grid-cols-4 gap-4">
            {(() => {
              const r = reactors.find((r) => r.reactor_id === selectedReactor);
              return (
                <>
                  <div className="text-center">
                    <p className="text-gray-400 text-sm">Temperature</p>
                    <p className="text-orange-400 text-2xl font-bold">
                      {r.temperature}°C
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-400 text-sm">Pressure</p>
                    <p className="text-blue-400 text-2xl font-bold">
                      {r.pressure} bar
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-400 text-sm">Risk Score</p>
                    <p className="text-red-400 text-2xl font-bold">
                      {r.risk_score}%
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-400 text-sm">Status</p>
                    <p
                      className={`text-2xl font-bold ${
                        r.status === "SAFE"
                          ? "text-green-400"
                          : r.status === "WARNING"
                            ? "text-yellow-400"
                            : "text-red-400"
                      }`}
                    >
                      {r.status}
                    </p>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

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
          {/* Temperature History */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-white font-semibold mb-4">
              🌡️ Temperature History
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 9 }} />
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

          {/* Risk Score History */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-white font-semibold mb-4">
              🤖 AI Risk Score History
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 9 }} />
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

          {/* Pressure History */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-white font-semibold mb-4">
              💨 Pressure History
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 9 }} />
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

          {/* Cooling Efficiency History */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-white font-semibold mb-4">
              ❄️ Cooling Efficiency History
            </h3>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#6b7280" tick={{ fontSize: 9 }} />
                <YAxis
                  stroke="#6b7280"
                  tick={{ fontSize: 10 }}
                  domain={[0, 1]}
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
                  dataKey="cooling_efficiency"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

export default Analytics;
