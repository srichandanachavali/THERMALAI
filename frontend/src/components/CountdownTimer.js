import React from 'react';

function CountdownTimer({ reactor }) {
  if (!reactor) return null;

  const { minutes_to_critical, time_message, status } = reactor;

  if (status === 'SAFE' || !time_message) {
    return (
      <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 flex items-center gap-3">
        <span className="text-2xl">✅</span>
        <div>
          <p className="text-green-400 font-semibold">Reactor Safe</p>
          <p className="text-gray-400 text-sm">Operating within normal parameters</p>
        </div>
      </div>
    );
  }

  const getBgColor = () => {
    if (status === 'CRITICAL' || minutes_to_critical < 5) return 'bg-red-500/10 border-red-500/30';
    if (minutes_to_critical < 15) return 'bg-yellow-500/10 border-yellow-500/30';
    return 'bg-yellow-500/10 border-yellow-500/30';
  };

  const getTextColor = () => {
    if (status === 'CRITICAL' || minutes_to_critical < 5) return 'text-red-400';
    return 'text-yellow-400';
  };

  const getIcon = () => {
    if (status === 'CRITICAL' || minutes_to_critical === 0) return '🔴';
    if (minutes_to_critical < 5) return '🚨';
    if (minutes_to_critical < 15) return '⚠️';
    return '⚠️';
  };

  return (
    <div className={`border rounded-lg p-4 ${getBgColor()}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{getIcon()}</span>
          <div>
            <p className={`font-bold text-lg ${getTextColor()}`}>
              {status === 'CRITICAL' || minutes_to_critical === 0
                ? 'THERMAL RUNAWAY IN PROGRESS'
                : `Critical in ${minutes_to_critical} minutes`}
            </p>
            <p className="text-gray-400 text-sm mt-1">{time_message}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={`text-4xl font-bold ${getTextColor()}`}>
            {minutes_to_critical === 0 ? '🔴' : `${minutes_to_critical}m`}
          </p>
          <p className="text-gray-500 text-xs">to critical</p>
        </div>
      </div>

      {/* Progress bar */}
      {minutes_to_critical !== null && minutes_to_critical > 0 && (
        <div className="mt-3">
          <div className="bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                minutes_to_critical < 5 ? 'bg-red-500' : 'bg-yellow-500'
              }`}
              style={{
                width: `${Math.max(5, 100 - (minutes_to_critical / 30) * 100)}%`
              }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Now</span>
            <span>Critical threshold</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default CountdownTimer;