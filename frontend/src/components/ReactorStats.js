import React from "react";

function ReactorStats({ reactor }) {
  return (
    <div className="col-span-2 grid grid-cols-2 gap-4">
      <div className="bg-gray-800 rounded-lg p-6">
        <p className="text-gray-400 text-sm uppercase tracking-wide">Temperature</p>
        <p className="text-4xl font-bold text-orange-400 mt-2">{reactor.temperature}°C</p>
        <p className="text-gray-500 text-sm mt-1">Current reading</p>
      </div>
      <div className="bg-gray-800 rounded-lg p-6">
        <p className="text-gray-400 text-sm uppercase tracking-wide">Pressure</p>
        <p className="text-4xl font-bold text-blue-400 mt-2">{reactor.pressure} bar</p>
        <p className="text-gray-500 text-sm mt-1">Current reading</p>
      </div>
      <div className="bg-gray-800 rounded-lg p-6">
        <p className="text-gray-400 text-sm uppercase tracking-wide">Reaction Rate</p>
        <p className="text-4xl font-bold text-purple-400 mt-2">{reactor.reaction_rate}</p>
        <p className="text-gray-500 text-sm mt-1">Current reading</p>
      </div>
      <div className="bg-gray-800 rounded-lg p-6">
        <p className="text-gray-400 text-sm uppercase tracking-wide">Cooling Efficiency</p>
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
  );
}

export default ReactorStats;
