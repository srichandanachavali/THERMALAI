import React from 'react';

function AlertFeed({ alerts, limit = 5 }) {
  const getAlertStyle = (type) => {
    if (type === 'CRITICAL') return 'border-red-500 bg-red-500/10';
    if (type === 'WARNING') return 'border-yellow-500 bg-yellow-500/10';
    return 'border-green-500 bg-green-500/10';
  };

  const getDotColor = (type) => {
    if (type === 'CRITICAL') return 'bg-red-500';
    if (type === 'WARNING') return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const displayAlerts = alerts.slice(0, limit);

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-gray-300 font-semibold text-sm uppercase tracking-wide mb-4">
        Recent Alerts
      </h3>
      {displayAlerts.length === 0 ? (
        <div className="text-gray-500 text-center py-8 text-sm">
          No active alerts — all reactors safe
        </div>
      ) : (
        <div className="space-y-3">
          {displayAlerts.map((alert, index) => (
            <div
              key={index}
              className={`border-l-4 ${getAlertStyle(alert.alert_type)} rounded-r-lg p-4`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${getDotColor(alert.alert_type)}`}></div>
                  <span className="text-white font-semibold">
                    Reactor {alert.reactor_id}
                  </span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    alert.alert_type === 'CRITICAL' 
                      ? 'bg-red-500 text-white' 
                      : 'bg-yellow-500 text-black'
                  }`}>
                    {alert.alert_type}
                  </span>
                </div>
                <span className="text-red-400 font-bold">
                  {alert.risk_score}%
                </span>
              </div>
              <p className="text-gray-400 text-sm mt-2">{alert.message}</p>
              <p className="text-gray-500 text-xs mt-1">
                {new Date(alert.timestamp).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AlertFeed;