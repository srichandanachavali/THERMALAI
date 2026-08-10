import React from "react";
import { getReactorConfig } from "../constants/reactors";

function CurrentStatusCard({ reactor }) {
  if (!reactor) return null;
  const config = getReactorConfig(reactor.reactor_id);

  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-6">
      <h3 className="text-white font-semibold mb-3">
        {config.tag} — {config.name} · Current Status
      </h3>
      <div className="grid grid-cols-4 gap-4">
        <div className="text-center">
          <p className="text-gray-400 text-sm">Temperature</p>
          <p className="text-orange-400 text-2xl font-bold">{reactor.temperature}°C</p>
        </div>
        <div className="text-center">
          <p className="text-gray-400 text-sm">Pressure</p>
          <p className="text-blue-400 text-2xl font-bold">{reactor.pressure} bar</p>
        </div>
        <div className="text-center">
          <p className="text-gray-400 text-sm">Risk Score</p>
          <p className="text-red-400 text-2xl font-bold">{reactor.risk_score}%</p>
        </div>
        <div className="text-center">
          <p className="text-gray-400 text-sm">Status</p>
          <p
            className={`text-2xl font-bold ${
              reactor.status === "SAFE"
                ? "text-green-400"
                : reactor.status === "WARNING"
                  ? "text-yellow-400"
                  : "text-red-400"
            }`}
          >
            {reactor.status}
          </p>
        </div>
      </div>
    </div>
  );
}

export default CurrentStatusCard;
