import React from "react";

// Horizontal live alert strip used on the Home command center.
function AlertFeed({ alerts, limit = 8, onSelect, onViewAll }) {
  return (
    <div
      className="p-5"
      style={{
        backgroundColor: "var(--card)",
        border: "1px solid var(--border)",
        borderRadius: 12,
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
          Live Alert Feed
        </h3>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-xs font-semibold"
            style={{ color: "var(--accentLight)" }}
          >
            View all →
          </button>
        )}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {alerts.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--textSub)" }}>
            No recent alerts — all systems nominal
          </p>
        ) : (
          alerts.slice(0, limit).map((alert) => (
            <div
              key={alert._id}
              onClick={() => onSelect && onSelect(alert.reactor_id)}
              className="shrink-0 p-3 cursor-pointer"
              style={{
                border: "1px solid var(--border)",
                borderLeft: `3px solid ${
                  alert.alert_type === "CRITICAL" ? "var(--danger)" : "var(--warning)"
                }`,
                borderRadius: 8,
                width: 240,
              }}
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className="text-[10px] font-bold uppercase tracking-wider"
                  style={{ color: "var(--textMuted)" }}
                >
                  Reactor {alert.reactor_id}
                </span>
                <span className="text-xs font-bold" style={{ color: "var(--text)" }}>
                  {alert.risk_score}%
                </span>
              </div>
              <p className="text-xs leading-snug" style={{ color: "var(--textSub)" }}>
                {alert.message}
              </p>
              <p className="text-[10px] mt-1" style={{ color: "var(--textMuted)" }}>
                {new Date(alert.timestamp).toLocaleTimeString()}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default AlertFeed;
