import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import { getAlerts } from "../services/api";
import AlertRow from "../components/AlertRow";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "warning", label: "Warning" },
  { key: "critical", label: "Critical" },
  { key: "gas", label: "Gas Alert" },
  { key: "resolved", label: "Resolved" },
];

function Alerts() {
  const { alerts } = useSocket();
  const navigate = useNavigate();
  const [allAlerts, setAllAlerts] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const data = await getAlerts();
        setAllAlerts(data);
      } catch {
        // alerts not yet available
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

  const counts = useMemo(() => ({
    all: allAlerts.length,
    warning: allAlerts.filter((a) => a.alert_type === "WARNING").length,
    critical: allAlerts.filter((a) => a.alert_type === "CRITICAL").length,
    gas: allAlerts.filter((a) => (a.gas_concentration ?? 0) > 25).length,
    resolved: allAlerts.filter((a) => a.resolved).length,
  }), [allAlerts]);

  const filtered = useMemo(() => {
    if (activeFilter === "all") return allAlerts;
    if (activeFilter === "resolved") return allAlerts.filter((a) => a.resolved);
    if (activeFilter === "gas")
      return allAlerts.filter((a) => !a.resolved && (a.gas_concentration ?? 0) > 25);
    return allAlerts.filter(
      (a) => !a.resolved && a.alert_type === activeFilter.toUpperCase(),
    );
  }, [allAlerts, activeFilter]);

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
          Alert Center
        </h1>
        <p className="mt-1" style={{ color: "var(--textSub)" }}>
          Audit log of AI-triggered safety events — read-only
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setActiveFilter(f.key)}
              className="text-sm font-semibold px-4 py-1.5 rounded-full transition-colors"
              style={{
                backgroundColor: activeFilter === f.key ? "var(--accent)" : "var(--card)",
                color: activeFilter === f.key ? "#fff" : "var(--textSub)",
                border: `1px solid ${activeFilter === f.key ? "var(--accent)" : "var(--border)"}`,
              }}
            >
              {f.label}
              <span className="ml-1.5 opacity-60">{counts[f.key]}</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div
          className="text-center py-16"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
          }}
        >
          <p style={{ color: "var(--success)", fontSize: 18, fontWeight: 600 }}>
            No alerts in this view
          </p>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {/* Table header */}
          <div
            className="grid grid-cols-[110px_1fr_1fr_110px_90px_80px_90px_2fr] gap-3 px-5 py-3 text-[11px] font-bold uppercase tracking-wider"
            style={{ color: "var(--textMuted)", borderBottom: "1px solid var(--border)" }}
          >
            <span>Time</span>
            <span>Reactor</span>
            <span>Plant</span>
            <span>Type</span>
            <span>Risk</span>
            <span>Temp</span>
            <span>Press</span>
            <span>Message</span>
          </div>

          {/* Rows */}
          <div>
            {filtered.map((alert) => (
              <AlertRow
                key={alert._id}
                alert={alert}
                onSelect={(id) => navigate(`/reactor/${id}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Alerts;
