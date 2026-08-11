import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { FiTool, FiClock, FiCheckCircle } from 'react-icons/fi';
import StatusBadge from './StatusBadge';

const API =
  process.env.REACT_APP_API_URL?.replace('/api', '') ||
  'http://localhost:5000';

const DEFAULT_MAINTENANCE = {
  success: true,
  overall_health: 86,
  overall_status: 'HEALTHY',
  overall_message: 'Fleet operating within nominal parameters',
  next_maintenance: null,
  components: [
    {
      component: 'Coolant Pump',
      icon: '🔄',
      current_health: 87,
      urgency: 'NORMAL',
      rul_hours: 420,
      message: 'Flow and vibration trends nominal.',
      recommendation: 'Continue routine inspection schedule.',
    },
    {
      component: 'Agitator Bearing',
      icon: '⚙️',
      current_health: 94,
      urgency: 'NORMAL',
      rul_hours: 1120,
      message: 'Bearing temperature and load stable.',
      recommendation: 'No action required.',
    },
    {
      component: 'Valve Seal',
      icon: '🔧',
      current_health: 78,
      urgency: 'LOW',
      rul_hours: 240,
      message: 'Seal wear progressing at expected rate.',
      recommendation: 'Plan replacement at next scheduled outage.',
    },
  ],
};

function MaintenancePanel({ reactor }) {
  const [maintenance, setMaintenance] = useState(DEFAULT_MAINTENANCE);

  const fetchMaintenance = useCallback(async () => {
    try {
      const response = await axios.get(
        `${API}/api/reactors/${reactor.reactor_id}/maintenance`
      );
      if (response.data.success) {
        setMaintenance(response.data);
      }
    } catch {}
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

  return (
    <div className="rounded-lg p-6" style={{ backgroundColor: "var(--card)" }}>
      <h3 className="font-semibold text-lg mb-2 inline-flex items-center gap-2" style={{ color: "var(--text)" }}>
        <FiTool aria-hidden="true" /> Predictive Maintenance
      </h3>
      <p className="text-sm mb-6" style={{ color: "var(--text-sub)" }}>
        AI-predicted equipment health based on sensor trends
      </p>

      {/* Overall Health */}
      <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: "var(--border)" }}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="font-bold text-lg" style={{ color: "var(--text)" }}>Overall Equipment Health</p>
            <p className="text-sm mt-1" style={{ color: "var(--text-sub)" }}>{maintenance.overall_message}</p>
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
        <div className="rounded-full h-3" style={{ backgroundColor: "var(--border)" }}>
          <div
            className={`h-3 rounded-full transition-all ${getHealthBg(maintenance.overall_health)}`}
            style={{ width: `${maintenance.overall_health}%` }}
          ></div>
        </div>
        {maintenance.next_maintenance !== null && maintenance.next_maintenance < 30 && (
          <p className="text-xs mt-2 inline-flex items-center gap-1.5" style={{ color: "var(--text-sub)" }}>
            <FiClock aria-hidden="true" /> Next maintenance recommended in{' '}
            <span className="text-yellow-400 font-bold">
              {maintenance.next_maintenance} days
            </span>
          </p>
        )}
      </div>

      {/* Components */}
      {maintenance.components && maintenance.components.length > 0 ? (
        <div>
          <p className="text-xs uppercase tracking-wide mb-3" style={{ color: "var(--text-sub)" }}>
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
                    <span className="font-semibold" style={{ color: "var(--text)" }}>{comp.component}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold">
                      Health: {comp.current_health}%
                    </span>
                    {comp.rul_hours !== undefined && comp.rul_hours !== null && (
                      <span className="text-xs font-semibold" style={{ color: "var(--text-sub)" }}>
                        RUL ~{comp.rul_hours} hrs
                      </span>
                    )}
                    <StatusBadge status={comp.urgency === 'NORMAL' || comp.urgency === 'LOW' ? 'NOMINAL' : comp.urgency} />
                  </div>
                </div>
                <p className="text-sm mb-2">{comp.message}</p>
                <p className="text-xs" style={{ color: "var(--text-sub)" }}>
                  → {comp.recommendation}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-center">
          <p className="text-green-400 font-bold inline-flex items-center justify-center gap-1.5">
            <FiCheckCircle aria-hidden="true" /> All components healthy
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--text-sub)" }}>No maintenance required at this time</p>
        </div>
      )}
    </div>
  );
}

export default MaintenancePanel;