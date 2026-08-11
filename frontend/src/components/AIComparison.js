import React from 'react';
import { FiCpu, FiActivity } from 'react-icons/fi';
import { RISK_THRESHOLDS } from '../constants/reactors';


function AIComparison({ reactor }) {
  if (!reactor || !reactor.rf_score) return null;

  const rfScore = reactor.rf_score || 0;
  const lstmScore = reactor.lstm_score || 0;
  const ensembleScore = reactor.risk_score || 0;
  const lstmConfidence = reactor.lstm_confidence || 0;

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

  return (
    <div className="rounded-lg p-6" style={{ backgroundColor: "var(--card)" }}>
      <h3 className="font-semibold text-lg mb-2 inline-flex items-center gap-2" style={{ color: "var(--text)" }}>
        <FiCpu aria-hidden="true" /> AI Model Comparison
      </h3>
      <p className="text-sm mb-6" style={{ color: "var(--text-sub)" }}>
        Two independent AI models cross-validating each other
      </p>

      {/* RF Score */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="font-medium" style={{ color: "var(--text)" }}>Random Forest</span>
            <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>— pattern classifier</span>
          </div>
          <span className={`font-bold text-lg ${getTextColor(rfScore)}`}>
            {rfScore}%
          </span>
        </div>
        <div className="rounded-full h-3" style={{ backgroundColor: "var(--border)" }}>
          <div
            className={`h-3 rounded-full transition-all ${getBarColor(rfScore)}`}
            style={{ width: `${rfScore}%` }}
          ></div>
        </div>
      </div>

      {/* LSTM Score */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="font-medium" style={{ color: "var(--text)" }}>LSTM Neural Network</span>
            <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>— time-series predictor</span>
          </div>
          <div className="text-right">
            <span className={`font-bold text-lg ${getTextColor(lstmScore)}`}>
              {lstmScore}%
            </span>
            <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>
              ({lstmConfidence}% conf.)
            </span>
          </div>
        </div>
        <div className="rounded-full h-3" style={{ backgroundColor: "var(--border)" }}>
          <div
            className={`h-3 rounded-full transition-all ${getBarColor(lstmScore)}`}
            style={{ width: `${lstmScore}%` }}
          ></div>
        </div>
      </div>

      {/* Ensemble Score */}
      <div className="rounded-lg p-4 mt-4" style={{ backgroundColor: "var(--border)" }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="font-bold" style={{ color: "var(--text)" }}>Ensemble Score</span>
            <span className="text-xs ml-2" style={{ color: "var(--text-sub)" }}>— RF×40% + LSTM×60%</span>
          </div>
          <span className={`font-bold text-2xl ${getTextColor(ensembleScore)}`}>
            {ensembleScore}%
          </span>
        </div>
        <div className="rounded-full h-4" style={{ backgroundColor: "var(--border)" }}>
          <div
            className={`h-4 rounded-full transition-all ${getBarColor(ensembleScore)}`}
            style={{ width: `${ensembleScore}%` }}
          ></div>
        </div>
        <p className="text-xs mt-2 text-center" style={{ color: "var(--text-sub)" }}>
          Final risk score used for alerts and decisions
        </p>
      </div>

      {/* LSTM insight */}
      {reactor.lstm_prediction && (
        <div className={`mt-4 p-3 rounded-lg border ${
          reactor.lstm_prediction === 'CRITICAL' 
            ? 'bg-red-500/10 border-red-500/30' 
            : reactor.lstm_prediction === 'WARNING'
            ? 'bg-yellow-500/10 border-yellow-500/30'
            : 'bg-green-500/10 border-green-500/30'
        }`}>
          <p className="text-sm inline-flex items-center gap-1.5" style={{ color: "var(--text)" }}>
            <FiActivity aria-hidden="true" /> LSTM time-series analysis detected:
            <span className={`font-bold ml-1 ${
              reactor.lstm_prediction === 'CRITICAL' ? 'text-red-400' :
              reactor.lstm_prediction === 'WARNING' ? 'text-yellow-400' : 'text-green-400'
            }`}>
              {reactor.lstm_prediction}
            </span>
            <span className="text-xs ml-2" style={{ color: "var(--text-muted)" }}>
              based on last 10 readings
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

export default AIComparison;