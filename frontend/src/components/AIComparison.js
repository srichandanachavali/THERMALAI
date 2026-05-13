import React from 'react';


function AIComparison({ reactor }) {
  if (!reactor || !reactor.rf_score) return null;

  const rfScore = reactor.rf_score || 0;
  const lstmScore = reactor.lstm_score || 0;
  const ensembleScore = reactor.risk_score || 0;
  const lstmConfidence = reactor.lstm_confidence || 0;

  const getBarColor = (score) => {
    if (score >= 70) return 'bg-red-500';
    if (score >= 30) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTextColor = (score) => {
    if (score >= 70) return 'text-red-400';
    if (score >= 30) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-white font-semibold text-lg mb-2">
        🤖 AI Model Comparison
      </h3>
      <p className="text-gray-400 text-sm mb-6">
        Two independent AI models cross-validating each other
      </p>

      {/* RF Score */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-white font-medium">Random Forest</span>
            <span className="text-gray-500 text-xs ml-2">— pattern classifier</span>
          </div>
          <span className={`font-bold text-lg ${getTextColor(rfScore)}`}>
            {rfScore}%
          </span>
        </div>
        <div className="bg-gray-700 rounded-full h-3">
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
            <span className="text-white font-medium">LSTM Neural Network</span>
            <span className="text-gray-500 text-xs ml-2">— time-series predictor</span>
          </div>
          <div className="text-right">
            <span className={`font-bold text-lg ${getTextColor(lstmScore)}`}>
              {lstmScore}%
            </span>
            <span className="text-gray-500 text-xs ml-2">
              ({lstmConfidence}% conf.)
            </span>
          </div>
        </div>
        <div className="bg-gray-700 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all ${getBarColor(lstmScore)}`}
            style={{ width: `${lstmScore}%` }}
          ></div>
        </div>
      </div>

      {/* Ensemble Score */}
      <div className="bg-gray-700/50 rounded-lg p-4 mt-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-white font-bold">Ensemble Score</span>
            <span className="text-gray-400 text-xs ml-2">— RF×40% + LSTM×60%</span>
          </div>
          <span className={`font-bold text-2xl ${getTextColor(ensembleScore)}`}>
            {ensembleScore}%
          </span>
        </div>
        <div className="bg-gray-600 rounded-full h-4">
          <div
            className={`h-4 rounded-full transition-all ${getBarColor(ensembleScore)}`}
            style={{ width: `${ensembleScore}%` }}
          ></div>
        </div>
        <p className="text-gray-400 text-xs mt-2 text-center">
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
          <p className="text-gray-300 text-sm">
            🧠 LSTM time-series analysis detected: 
            <span className={`font-bold ml-1 ${
              reactor.lstm_prediction === 'CRITICAL' ? 'text-red-400' :
              reactor.lstm_prediction === 'WARNING' ? 'text-yellow-400' : 'text-green-400'
            }`}>
              {reactor.lstm_prediction}
            </span>
            <span className="text-gray-500 text-xs ml-2">
              based on last 10 readings
            </span>
          </p>
        </div>
      )}
    </div>
  );
}

export default AIComparison;