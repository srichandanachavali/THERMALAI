import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API =
  process.env.REACT_APP_API_URL?.replace('/api', '') ||
  'http://localhost:5000';

function MaintenancePanel({ reactor }) {
  const [maintenance, setMaintenance] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchMaintenance = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        `${API}/api/reactors/${reactor.reactor_id}/maintenance`
      );
      if (response.data.success) {
        setMaintenance(response.data);
      }
    } catch {}
    setLoading(false);
  }, [reactor]);

  useEffect(() => {
    if (reactor && reactor.reactor_id) {
      fetchMaintenance();
    }
  }, [reactor, fetchMaintenance]);

  const getHealthColor = (health) => {
    if (health >= 80) return 'text-green-400';
    if (health >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getHealthBg = (health) => {
    if (health >= 80) return 'bg-green-500';
    if (health >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getUrgencyStyle = (urgency) => {
    if (urgency === 'CRITICAL') return 'bg-red-500/10 border-red-500/30 text-red-400';
    if (urgency === 'WARNING') return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400';
    return 'bg-blue-500/10 border-blue-500/30 text-blue-400';
  };

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-white font-semibold text-lg mb-4">🔧 Predictive Maintenance</h3>
        <div className="text-gray-400 text-center py-4">Analyzing equipment health...</div>
      </div>
    );
  }

  if (!maintenance) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-white font-semibold text-lg mb-4">🔧 Predictive Maintenance</h3>
        <div className="text-gray-400 text-center py-4">
          Building maintenance data... start the stream first.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-white font-semibold text-lg mb-2">
        🔧 Predictive Maintenance
      </h3>
      <p className="text-gray-400 text-sm mb-6">
        AI-predicted equipment health based on sensor trends
      </p>

      {/* Overall Health */}
      <div className="bg-gray-700/50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-white font-bold text-lg">Overall Equipment Health</p>
            <p className="text-gray-400 text-sm mt-1">{maintenance.overall_message}</p>
          </div>
          <div className="text-right">
            <p className={`text-4xl font-bold ${getHealthColor(maintenance.overall_health)}`}>
              {maintenance.overall_health}%
            </p>
            <p className={`text-xs font-bold mt-1 ${
              maintenance.overall_status === 'HEALTHY' ? 'text-green-400' :
              maintenance.overall_status === 'WARNING' ? 'text-yellow-400' :
              maintenance.overall_status === 'CRITICAL' ? 'text-red-400' : 'text-blue-400'
            }`}>
              {maintenance.overall_status}
            </p>
          </div>
        </div>
        <div className="bg-gray-600 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${getHealthBg(maintenance.overall_health)}`}
            style={{ width: `${maintenance.overall_health}%` }}
          ></div>
        </div>
        {maintenance.next_maintenance !== null && maintenance.next_maintenance < 30 && (
          <p className="text-gray-400 text-xs mt-2">
            ⏰ Next maintenance recommended in{' '}
            <span className="text-yellow-400 font-bold">
              {maintenance.next_maintenance} days
            </span>
          </p>
        )}
      </div>

      {/* Components */}
      {maintenance.components && maintenance.components.length > 0 ? (
        <div>
          <p className="text-gray-400 text-xs uppercase tracking-wide mb-3">
            Components needing attention
          </p>
          <div className="space-y-3">
            {maintenance.components.map((comp, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${getUrgencyStyle(comp.urgency)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{comp.icon}</span>
                    <span className="font-semibold text-white">{comp.component}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold">
                      Health: {comp.current_health}%
                    </span>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                      comp.urgency === 'CRITICAL' ? 'bg-red-500 text-white' :
                      comp.urgency === 'WARNING' ? 'bg-yellow-500 text-black' :
                      'bg-blue-500 text-white'
                    }`}>
                      {comp.urgency}
                    </span>
                  </div>
                </div>
                <p className="text-sm mb-2">{comp.message}</p>
                <p className="text-gray-400 text-xs">
                  → {comp.recommendation}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
          <p className="text-green-400 font-bold">✅ All components healthy</p>
          <p className="text-gray-400 text-sm mt-1">No maintenance required at this time</p>
        </div>
      )}
    </div>
  );
}

export default MaintenancePanel;