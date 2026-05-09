import React from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import MetricCard from "../components/MetricCard";
import ReactorHeatmap from "../components/ReactorHeatmap";
import AlertFeed from "../components/AlertFeed";

function Home() {
  const { reactors, alerts } = useSocket();
  const navigate = useNavigate();

  const safeCount = reactors.filter((r) => r.status === "SAFE").length;
  const warningCount = reactors.filter((r) => r.status === "WARNING").length;
  const criticalCount = reactors.filter((r) => r.status === "CRITICAL").length;

  const sortedReactors = [...reactors].sort(
    (a, b) => b.risk_score - a.risk_score,
  );

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Plant Overview</h1>
        <p className="text-gray-400 mt-1">
          Real-time thermal runaway prevention — {reactors.length} reactors
          monitored
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Total Reactors"
          value={reactors.length}
          subtitle="Being monitored"
          color="blue"
        />
        <MetricCard
          title="Safe"
          value={safeCount}
          subtitle="Operating normally"
          color="green"
        />
        <MetricCard
          title="Warning"
          value={warningCount}
          subtitle="Needs attention"
          color="yellow"
        />
        <MetricCard
          title="Critical"
          value={criticalCount}
          subtitle="Immediate action!"
          color="red"
        />
      </div>

      {/* Risk Ranking + Heatmap */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        {/* Risk Ranking Panel */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-white font-semibold text-lg mb-4">
            Risk Ranking — All Reactors
          </h3>
          {sortedReactors.length === 0 ? (
            <div className="text-gray-400 text-center py-8">
              Waiting for reactor data...
            </div>
          ) : (
            <div className="space-y-3">
              {sortedReactors.map((reactor) => (
                <div
                  key={reactor.reactor_id}
                  onClick={() => navigate(`/reactor/${reactor.reactor_id}`)}
                  className="flex items-center gap-4 cursor-pointer hover:bg-gray-700 p-3 rounded-lg transition-all"
                >
                  <span className="text-white font-bold w-24">
                    Reactor {reactor.reactor_id}
                  </span>
                  <div className="flex-1 bg-gray-700 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        reactor.status === "SAFE"
                          ? "bg-green-500"
                          : reactor.status === "WARNING"
                            ? "bg-yellow-500"
                            : "bg-red-500"
                      }`}
                      style={{ width: `${reactor.risk_score}%` }}
                    ></div>
                  </div>
                  <span
                    className={`font-bold w-12 text-right ${
                      reactor.status === "SAFE"
                        ? "text-green-400"
                        : reactor.status === "WARNING"
                          ? "text-yellow-400"
                          : "text-red-400"
                    }`}
                  >
                    {reactor.risk_score}%
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-bold ${
                      reactor.status === "SAFE"
                        ? "bg-green-500/20 text-green-400"
                        : reactor.status === "WARNING"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {reactor.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Heatmap */}
        <ReactorHeatmap reactors={reactors} />
      </div>

      {/* Alert Feed */}
      <AlertFeed alerts={alerts} limit={5} />
    </div>
  );
}

export default Home;
