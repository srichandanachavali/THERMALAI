import React from 'react';
import { FiShield } from 'react-icons/fi';
import { RISK_THRESHOLDS, getSilBand } from '../constants/reactors';

function RiskGauge({ score, status }) {
  const getColor = () => {
    if (score < RISK_THRESHOLDS.WARNING) return '#22c55e';
    if (score < RISK_THRESHOLDS.CRITICAL) return '#eab308';
    return '#ef4444';
  };

  const getBgColor = () => {
    if (score < RISK_THRESHOLDS.WARNING) return 'bg-green-500';
    if (score < RISK_THRESHOLDS.CRITICAL) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const radius = 80;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const sil = getSilBand(score);

  return (
    <div className="flex flex-col items-center justify-center p-6">
      <div className="relative">
        <svg width="200" height="200" className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth="16"
          />
          {/* Progress circle */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="none"
            stroke={getColor()}
            strokeWidth="16"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold" style={{ color: "var(--text)" }}>{score}%</span>
          <span className="text-sm" style={{ color: "var(--text-sub)" }}>Risk Score</span>
        </div>
      </div>
      <div className={`mt-4 px-6 py-2 rounded-full ${getBgColor()} font-bold text-lg`} style={{ color: "var(--text)" }}>
        {status}
      </div>
      <span
        className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full"
        style={{ backgroundColor: sil.color, color: "#fff" }}
      >
        <FiShield size={12} aria-hidden="true" />
        {sil.sil} · {sil.label}
      </span>
    </div>
  );
}

export default RiskGauge;