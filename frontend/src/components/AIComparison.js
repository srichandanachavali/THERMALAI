import React from 'react';
import { FiCpu, FiActivity } from 'react-icons/fi';
import { RISK_THRESHOLDS } from '../constants/reactors';

function AIComparison({ reactor }) {
  if (!reactor) return null;

  // Render if at least one model score is present
  const hasAnyScore =
    reactor.physics_score != null ||
    reactor.xgb_score != null ||
    reactor.rf_score != null ||
    reactor.lstm_score != null ||
    reactor.risk_score != null;

  if (!hasAnyScore) return null;

  const getBarColor = (score) => {
    if (score >= RISK_THRESHOLDS.CRITICAL) return 'bg-red-500';
    if (score >= RISK_THRESHOLDS.WARNING) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTextColor = (score) => {
    if (score >= RISK_THRESHOLDS.CRITICAL) return 'text-red-400';
    if (score >= RISK_THRESHOLDS.WARNING) return 'text-yellow-400';
    return 'text-green-400';
  };

  // Four independent models side by side
  const models = [
    {
      key: 'physics',
      label: 'Physics (Arrhenius)',
      sub: '— kinetics equation',
      score: reactor.physics_score,
      confidence: reactor.physics_confidence,
    },
    {
      key: 'xgb',
      label: 'XGBoost',
      sub: '— gradient-boosted trees',
      score: reactor.xgb_score,
      confidence: reactor.xgb_confidence,
    },
    {
      key: 'rf',
      label: 'Random Forest',
      sub: '— pattern classifier',
      score: reactor.rf_score,
      confidence: reactor.rf_confidence,
    },
    {
      key: 'lstm',
      label: 'LSTM Neural Network',
      sub: '— time-series predictor',
      score: reactor.lstm_score,
      confidence: reactor.lstm_confidence,
    },
  ];

  const overallRisk = Math.round(reactor.risk_score || 0);

  return (
    <div
      className="rounded-xl p-6"
      style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)' }}
    >
      <h3
        className="font-semibold text-lg mb-1 inline-flex items-center gap-2"
        style={{ color: 'var(--text)' }}
      >
        <FiCpu aria-hidden="true" /> AI Model Comparison & Ensemble Bench
      </h3>
      <p className="text-sm mb-6" style={{ color: 'var(--text-sub)' }}>
        Four independent AI models cross-validating telemetry in real time
      </p>

      {/* Model rows */}
      <div className="space-y-4">
        {models.map((m) => {
          if (m.score == null || m.score === undefined) return null;
          const score = Math.round(m.score);
          return (
            <div key={m.key}>
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <span className="font-medium text-sm" style={{ color: 'var(--text)' }}>
                    {m.label}
                  </span>
                  <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
                    {m.sub}
                  </span>
                </div>
                <div className="text-right">
                  <span className={`font-bold text-base ${getTextColor(score)}`}>
                    {score}%
                  </span>
                  {m.confidence != null && (
                    <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
                      ({Math.round(m.confidence)}% conf.)
                    </span>
                  )}
                </div>
              </div>
              <div
                className="rounded-full h-2.5 overflow-hidden"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
              >
                <div
                  className={`h-2.5 rounded-full transition-all duration-500 ${getBarColor(score)}`}
                  style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                ></div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ensemble Integrated Score */}
      <div
        className="rounded-xl p-4 mt-6"
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="font-bold text-base" style={{ color: 'var(--text)' }}>
              Ensemble Combined Risk
            </span>
            <span className="text-xs ml-2" style={{ color: 'var(--text-sub)' }}>
              — Integrated Weighted Consensus
            </span>
          </div>
          <span className={`font-bold text-2xl ${getTextColor(overallRisk)}`}>
            {overallRisk}%
          </span>
        </div>
        <div
          className="rounded-full h-3 overflow-hidden"
          style={{ backgroundColor: 'rgba(255, 255, 255, 0.08)' }}
        >
          <div
            className={`h-3 rounded-full transition-all duration-500 ${getBarColor(overallRisk)}`}
            style={{ width: `${Math.min(100, Math.max(0, overallRisk))}%` }}
          ></div>
        </div>
        <p className="text-xs mt-2 text-center" style={{ color: 'var(--text-sub)' }}>
          Final unified score driving safety interlocks, alarms, and mitigation actions
        </p>
      </div>

      {/* LSTM time-series insight */}
      {reactor.lstm_prediction && (
        <div
          className={`mt-4 p-3 rounded-lg border ${
            reactor.lstm_prediction === 'CRITICAL'
              ? 'bg-red-500/10 border-red-500/30'
              : reactor.lstm_prediction === 'WARNING'
              ? 'bg-yellow-500/10 border-yellow-500/30'
              : 'bg-green-500/10 border-green-500/30'
          }`}
        >
          <p className="text-sm inline-flex items-center gap-1.5" style={{ color: 'var(--text)' }}>
            <FiActivity aria-hidden="true" /> LSTM Sequence Predictor:
            <span
              className={`font-bold ml-1 ${
                reactor.lstm_prediction === 'CRITICAL'
                  ? 'text-red-400'
                  : reactor.lstm_prediction === 'WARNING'
                  ? 'text-yellow-400'
                  : 'text-green-400'
              }`}
            >
              {reactor.lstm_prediction}
            </span>
            <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
              (evaluated over last 10 window frames)
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

export default AIComparison;