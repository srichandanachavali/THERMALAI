import React from 'react';
import { RISK_THRESHOLDS } from '../constants/reactors';

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
          <span className="text-4xl font-bold text-white">{score}%</span>
          <span className="text-gray-400 text-sm">Risk Score</span>
        </div>
      </div>
      <div className={`mt-4 px-6 py-2 rounded-full ${getBgColor()} text-white font-bold text-lg`}>
        {status}
      </div>
    </div>
  );
}

export default RiskGauge;