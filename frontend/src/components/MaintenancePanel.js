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
  overall_message: 'Equipment operating within nominal mechanical bounds',
  next_maintenance: 14,
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
      message: 'Bearing temperature and mechanical load stable.',
      recommendation: 'No immediate action required.',
    },
    {
      component: 'Valve Seal',
      icon: '🔧',
      current_health: 78,
      urgency: 'LOW',
      rul_hours: 240,
      message: 'Seal wear progressing at expected rate.',
      recommendation: 'Plan replacement at next scheduled maintenance outage.',
    },
  ],
};

function MaintenancePanel({ reactor }) {
  const [maintenance, setMaintenance] = useState(DEFAULT_MAINTENANCE);

  const fetchMaintenance = useCallback(async () => {
    if (!reactor || !reactor.reactor_id) return;
    try {
      const response = await axios.get(
        `${API}/api/reactors/${reactor.reactor_id}/maintenance`
      );
      if (response.data && response.data.success) {
        setMaintenance(response.data);
      }
    } catch {
      // Retain default/dynamic fallback state on error
    }
  }, [reactor]);

  useEffect(() => {
    if (reactor && reactor.reactor_id) {
      fetchMaintenance();
    }
  }, [reactor, fetchMaintenance]);

  const getHealthColor = (health) => {
    if (health >= 80) return 'text-emerald-400';
    if (health >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getHealthBg = (health) => {
    if (health >= 80) return 'bg-emerald-500';
    if (health >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getUrgencyStyle = (urgency) => {
    if (urgency === 'CRITICAL') return 'bg-red-500/10 border-red-500/30 text-red-300';
    if (urgency === 'WARNING') return 'bg-yellow-500/10 border-yellow-500/30 text-yellow-300';
    return 'bg-blue-500/10 border-blue-500/30 text-blue-300';
  };

  return (
    <div className="rounded-xl p-6" style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)" }}>
      <h3 className="font-semibold text-lg mb-1 inline-flex items-center gap-2" style={{ color: "var(--text)" }}>
        <FiTool aria-hidden="true" /> Predictive Maintenance & Equipment Health
      </h3>
      <p className="text-sm mb-6" style={{ color: "var(--text-sub)" }}>
        AI-predicted component wear and Remaining Useful Life (RUL) tracking
      </p>

      {/* Overall Health Card */}
      <div className="rounded-xl p-5 mb-6" style={{ backgroundColor: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border)" }}>
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
              maintenance.overall_status === 'HEALTHY' ? 'text-emerald-400' :
              maintenance.overall_status === 'WARNING' ? 'text-yellow-400' :
              maintenance.overall_status === 'CRITICAL' ? 'text-red-400' : 'text-blue-400'
            }`}>
              {maintenance.overall_status}
            </p>
          </div>
        </div>

        <div className="rounded-full h-3 overflow-hidden" style={{ backgroundColor: "rgba(255, 255, 255, 0.08)" }}>
          <div
            className={`h-3 rounded-full transition-all duration-500 ${getHealthBg(maintenance.overall_health)}`}
            style={{ width: `${Math.min(100, Math.max(0, maintenance.overall_health))}%` }}
          ></div>
        </div>

        {maintenance.next_maintenance !== null && maintenance.next_maintenance !== undefined && (
          <p className="text-xs mt-3 inline-flex items-center gap-1.5 font-medium" style={{ color: "var(--text-sub)" }}>
            <FiClock aria-hidden="true" /> Recommended maintenance window in{' '}
            <span className="text-yellow-400 font-bold">
              {maintenance.next_maintenance} days
            </span>
          </p>
        )}
      </div>

      {/* Component Breakdown */}
      {maintenance.components && maintenance.components.length > 0 ? (
        <div>
          <p className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: "var(--text-sub)" }}>
            Individual Subsystem Health & RUL
          </p>
          <div className="space-y-3">
            {maintenance.components.map((comp, index) => (
              <div
                key={index}
                className={`border rounded-xl p-4 transition-all ${getUrgencyStyle(comp.urgency)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{comp.icon}</span>
                    <span className="font-semibold" style={{ color: "var(--text)" }}>{comp.component}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold" style={{ color: "var(--text)" }}>
                      Health: {comp.current_health}%
                    </span>
                    {comp.rul_hours !== undefined && comp.rul_hours !== null && (
                      <span className="text-xs font-mono font-semibold" style={{ color: "var(--text-sub)" }}>
                        RUL ~{comp.rul_hours} hrs ({Math.round(comp.rul_hours / 24)}d)
                      </span>
                    )}
                    <StatusBadge status={comp.urgency === 'NORMAL' || comp.urgency === 'LOW' ? 'NOMINAL' : comp.urgency} />
                  </div>
                </div>
                <p className="text-sm mb-1.5" style={{ color: "var(--text)" }}>{comp.message}</p>
                <p className="text-xs font-medium" style={{ color: "var(--text-sub)" }}>
                  → {comp.recommendation}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center">
          <p className="text-emerald-400 font-bold inline-flex items-center justify-center gap-1.5">
            <FiCheckCircle aria-hidden="true" /> All mechanical subsystems healthy
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--text-sub)" }}>No maintenance required at this time</p>
        </div>
      )}
    </div>
  );
}

export default MaintenancePanel;