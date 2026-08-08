import React from "react";
import { useNavigate } from "react-router-dom";
import {
  getStatusColor,
  getStatusBadge,
  getStatusIcon,
  getRiskColor,
  getRiskBarColor,
} from "../utils/plantStatus";

function PlantCard({ plant, plantReactors, plantStatus, plantRiskScore }) {
  const navigate = useNavigate();

  return (
    <div
      className={`bg-gray-800 border-2 rounded-xl p-6 ${getStatusColor(plantStatus)}`}
    >
      {/* Plant Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="text-4xl">🏭</div>
          <div>
            <h2 className="text-xl font-bold text-white">{plant.name}</h2>
            <p className="text-gray-400 text-sm">
              📍 {plant.location}, {plant.city}, {plant.state}
            </p>
            <p className="text-gray-500 text-xs mt-1">
              {plant.type} · Est. {plant.established}
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-3 mb-2">
            <span className={`px-4 py-2 rounded-full text-sm font-bold ${getStatusBadge(plantStatus)}`}>
              {getStatusIcon(plantStatus)} {plantStatus}
            </span>
          </div>
          <p className="text-gray-400 text-sm">
            Avg Risk: <span className={`font-bold ${getRiskColor(plantRiskScore)}`}>{plantRiskScore}%</span>
          </p>
        </div>
      </div>

      {/* Plant Risk Bar */}
      <div className="mb-6">
        <div className="bg-gray-700 rounded-full h-2 mb-1">
          <div
            className={`h-2 rounded-full transition-all ${getRiskBarColor(plantRiskScore)}`}
            style={{ width: `${plantRiskScore}%` }}
          ></div>
        </div>
      </div>

      {/* Reactors Grid */}
      <div>
        <p className="text-gray-400 text-xs uppercase tracking-wide mb-3">
          Reactors — click to monitor
        </p>
        {plantReactors.length === 0 ? (
          <div className="text-gray-500 text-sm">
            Waiting for reactor data...
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-3">
            {plantReactors.map((reactor) => (
              <div
                key={reactor.reactor_id}
                onClick={() => navigate(`/reactor/${reactor.reactor_id}`)}
                className={`cursor-pointer rounded-lg p-4 text-center transition-all hover:opacity-80 ${
                  reactor.status === "CRITICAL"
                    ? "bg-red-500 animate-pulse"
                    : reactor.status === "WARNING"
                      ? "bg-yellow-500"
                      : "bg-green-500"
                }`}
              >
                <p className="text-white font-bold text-lg">
                  {reactor.reactor_id}
                </p>
                <p className="text-white text-xs mt-1">
                  {reactor.risk_score}%
                </p>
                <p className="text-white text-xs opacity-80">
                  {reactor.status}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Plant Actions */}
      <div className="flex gap-3 mt-4 pt-4 border-t border-gray-700">
        <button
          onClick={() => navigate("/analytics")}
          className="bg-blue-500/20 hover:bg-blue-500/40 text-blue-400 text-sm px-4 py-2 rounded-lg transition-all"
        >
          📊 View Analytics
        </button>
        <button
          onClick={() => navigate("/alerts")}
          className="bg-red-500/20 hover:bg-red-500/40 text-red-400 text-sm px-4 py-2 rounded-lg transition-all"
        >
          🚨 View Alerts
        </button>
      </div>
    </div>
  );
}

export default PlantCard;
