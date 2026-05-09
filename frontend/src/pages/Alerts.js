import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import { getAlerts } from "../services/api";

function Alerts() {
  const { alerts } = useSocket();
  const navigate = useNavigate();
  const [allAlerts, setAllAlerts] = useState([]);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const data = await getAlerts();
        setAllAlerts(data);
      } catch (err) {
        console.log("Could not fetch alerts");
      }
    };
    fetchAlerts();
  }, []);

  // Merge live alerts with fetched alerts
  useEffect(() => {
    if (alerts.length > 0) {
      setAllAlerts((prev) => {
        const merged = [...alerts, ...prev];
        const unique = merged.filter(
          (alert, index, self) =>
            index === self.findIndex((a) => a._id === alert._id),
        );
        return unique.slice(0, 50);
      });
    }
  }, [alerts]);

  const criticalCount = allAlerts.filter(
    (a) => a.alert_type === "CRITICAL",
  ).length;
  const warningCount = allAlerts.filter(
    (a) => a.alert_type === "WARNING",
  ).length;

  const getAlertStyle = (type) => {
    if (type === "CRITICAL") return "border-red-500 bg-red-500/10";
    return "border-yellow-500 bg-yellow-500/10";
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Alert Center</h1>
        <p className="text-gray-400 mt-1">
          AI-triggered safety alerts — real time
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-800 border-l-4 border-red-500 rounded-lg p-6">
          <p className="text-gray-400 text-sm uppercase tracking-wide">
            Critical Alerts
          </p>
          <p className="text-4xl font-bold text-red-400 mt-2">
            {criticalCount}
          </p>
        </div>
        <div className="bg-gray-800 border-l-4 border-yellow-500 rounded-lg p-6">
          <p className="text-gray-400 text-sm uppercase tracking-wide">
            Warnings
          </p>
          <p className="text-4xl font-bold text-yellow-400 mt-2">
            {warningCount}
          </p>
        </div>
        <div className="bg-gray-800 border-l-4 border-blue-500 rounded-lg p-6">
          <p className="text-gray-400 text-sm uppercase tracking-wide">
            Total Alerts
          </p>
          <p className="text-4xl font-bold text-blue-400 mt-2">
            {allAlerts.length}
          </p>
        </div>
      </div>

      {/* Alert Feed */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-white font-semibold text-lg mb-4">
          🚨 Live Alert Feed
        </h3>
        {allAlerts.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-green-400 text-xl">✅ All reactors safe</p>
            <p className="text-gray-500 mt-2">No alerts at this time</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allAlerts.map((alert, index) => (
              <div
                key={index}
                onClick={() => navigate(`/reactor/${alert.reactor_id}`)}
                className={`border-l-4 ${getAlertStyle(alert.alert_type)} rounded-r-lg p-4 cursor-pointer hover:opacity-80 transition-all`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-full ${
                        alert.alert_type === "CRITICAL"
                          ? "bg-red-500 text-white"
                          : "bg-yellow-500 text-black"
                      }`}
                    >
                      {alert.alert_type}
                    </span>
                    <span className="text-white font-semibold">
                      Reactor {alert.reactor_id}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span
                      className={`font-bold text-lg ${
                        alert.alert_type === "CRITICAL"
                          ? "text-red-400"
                          : "text-yellow-400"
                      }`}
                    >
                      {alert.risk_score}%
                    </span>
                    <span className="text-gray-500 text-sm">
                      {new Date(alert.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
                <p className="text-gray-400 text-sm mt-2">{alert.message}</p>
                <div className="flex gap-6 mt-2">
                  <span className="text-gray-500 text-xs">
                    🌡️ {alert.temperature}°C
                  </span>
                  <span className="text-gray-500 text-xs">
                    💨 {alert.pressure} bar
                  </span>
                  <span className="text-blue-400 text-xs">
                    Click to view reactor →
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Alerts;
