import React from 'react';
import { useNavigate } from 'react-router-dom';

function ReactorHeatmap({ reactors }) {
  const navigate = useNavigate();

  const getColor = (status) => {
    if (status === 'SAFE') return 'bg-green-500 hover:bg-green-400';
    if (status === 'WARNING') return 'bg-yellow-500 hover:bg-yellow-400';
    if (status === 'CRITICAL') return 'bg-red-500 hover:bg-red-400 animate-pulse';
    return 'bg-gray-600';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-gray-300 font-semibold text-sm uppercase tracking-wide mb-4">
        Status Map
      </h3>
      {reactors.length === 0 ? (
        <div className="text-gray-400 text-center py-8">
          Waiting for reactor data...
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-3">
          {reactors.map((reactor) => (
            <div
              key={reactor.reactor_id}
              onClick={() => navigate(`/reactor/${reactor.reactor_id}`)}
              className={`${getColor(reactor.status)} cursor-pointer rounded-lg p-4 flex flex-col items-center justify-center transition-all`}
            >
              <span className="text-white font-bold text-lg">
                {reactor.reactor_id}
              </span>
              <span className="text-white text-xs mt-1">
                {reactor.risk_score}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ReactorHeatmap;