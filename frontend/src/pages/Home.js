import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiAlertCircle, FiActivity } from "react-icons/fi";
import { useSocket } from "../context/SocketContext";
import ReactorCard from "../components/ReactorCard";
import { ReactorCardSkeleton } from "../components/Skeletons";
import { getReactorConfig } from "../constants/reactors";

// Level 1 (OVERVIEW) priority — CRITICAL pinned first, then DEGRADING,
// then WARNING, then SAFE; within a band, highest risk first.
const STATUS_ORDER = { CRITICAL: 0, DEGRADING: 1, WARNING: 2, SAFE: 3 };

function Home() {
  const { reactors, alerts, connected } = useSocket();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    document.title = "ThermalAI — Plant Overview";
  }, []);

  // If no reactor data arrives within 10s, swap the skeleton for a setup guide.
  useEffect(() => {
    const t = setTimeout(() => setShowGuide(true), 10000);
    return () => clearTimeout(t);
  }, []);

  const safeCount = reactors.filter((r) => r.status === "SAFE").length;
  const warningCount = reactors.filter((r) => r.status === "WARNING").length;
  const criticalCount = reactors.filter((r) => r.status === "CRITICAL").length;

  const statCards = [
    { label: "Total", value: reactors.length, color: "var(--accentLight)" },
    { label: "Safe", value: safeCount, color: "var(--success)" },
    { label: "Warning", value: warningCount, color: "var(--warning)" },
    { label: "Critical", value: criticalCount, color: "var(--danger)" },
  ];

  const sortedReactors = [...reactors].sort((a, b) => {
    const oa = STATUS_ORDER[a.status] ?? 4;
    const ob = STATUS_ORDER[b.status] ?? 4;
    if (oa !== ob) return oa - ob;
    return (b.risk_score || 0) - (a.risk_score || 0);
  });

  // Data-source pill — Live Sensors / Simulation Mode / No Data.
  // Live sensors aren't integrated yet, so a connected, data-bearing socket is
  // reported as simulation; extend the branch when real telemetry lands.
  const dataSource = (() => {
    if (!connected || reactors.length === 0) {
      return { Icon: FiAlertCircle, label: "No Data", color: "var(--danger)" };
    }
    return { Icon: FiActivity, label: "Simulation Mode", color: "#3b82f6" };
  })();
  const DataIcon = dataSource.Icon;

  const minutesAgo = (ts) => {
    const t = new Date(ts).getTime();
    if (Number.isNaN(t)) return 0;
    return Math.max(0, Math.round((Date.now() - t) / 60000));
  };

  // Status summary strip — last 10 alerts as clickable chips.
  const alertChips = alerts.slice(0, 10).map((a) => ({
    _id: a._id,
    reactor_id: a.reactor_id,
    tag: getReactorConfig(a.reactor_id).tag,
    severity: a.alert_type,
    risk: a.risk_score,
    ageMin: minutesAgo(a.timestamp),
  }));

  return (
    <div>
      {/* Header — command center */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">
            Plant Overview
          </h1>
          <p className="text-gray-400 text-sm mb-6">
            Real-time thermal runaway prevention — {reactors.length} reactors monitored
          </p>
        </div>

        {/* Data source indicator */}
        <button
          onClick={() => navigate("/settings")}
          title="Data source — click to open Settings"
          className="flex items-center gap-2 text-[11px] font-bold px-3 py-1.5 rounded-full transition-colors"
          style={{
            backgroundColor: "var(--card)",
            border: "1px solid var(--border)",
            color: "var(--text)",
          }}
        >
          <DataIcon size={12} aria-hidden="true" />
          <span>{dataSource.label}</span>
        </button>

        {/* Live clock */}
        <div className="text-right" role="status" aria-live="polite">
          <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--text)" }}>
            {now.toLocaleTimeString()}
          </p>
          <p className="text-xs" style={{ color: "var(--textMuted)" }}>
            {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="p-5"
            style={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
            }}
          >
            <p className="text-xs uppercase tracking-wider" style={{ color: "var(--textSub)" }}>
              {card.label}
            </p>
            <p className="text-3xl font-bold mt-2" style={{ color: card.color }}>
              {card.value}
            </p>
          </div>
        ))}
      </div>

      {/* Reactor grid — CRITICAL cards span full width and are pinned to top */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {sortedReactors.length === 0 ? (
          connected && !showGuide ? (
            <>
              <ReactorCardSkeleton />
              <ReactorCardSkeleton />
              <ReactorCardSkeleton />
              <ReactorCardSkeleton />
            </>
          ) : connected ? (
            <div
              className="p-8 col-span-full"
              style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}
            >
              <p className="text-gray-300 font-semibold mb-1">
                Waiting for reactor data...
              </p>
              <p className="text-gray-400 text-sm mb-4">
                Make sure stream_data.py is running:
              </p>
              <pre className="bg-black text-green-400 text-sm p-4 rounded-lg overflow-x-auto">
                python stream_data.py
              </pre>
            </div>
          ) : (
            <div
              className="p-8 text-center text-sm col-span-full"
              style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--textSub)" }}
            >
              Connecting to server...
            </div>
          )
        ) : (
          sortedReactors.map((reactor) => (
            <div
              key={reactor.reactor_id}
              className={reactor.status === "CRITICAL" ? "lg:col-span-2" : ""}
            >
              <ReactorCard
                reactor={reactor}
                onClick={() => navigate(`/reactor/${reactor.reactor_id}`)}
              />
            </div>
          ))
        )}
      </div>

      {/* Status summary strip — replaces the old AlertFeed */}
      {alertChips.length > 0 && (
        <div
          className="mt-8 p-4"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--textSub)" }}>
            Recent Alerts
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {alertChips.map((chip) => (
              <button
                key={chip._id}
                onClick={() => navigate(`/reactor/${chip.reactor_id}`)}
                className="shrink-0 text-[11px] font-bold px-2.5 py-1.5 rounded-md transition-transform hover:scale-105"
                style={{
                  backgroundColor: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderLeft: `3px solid ${chip.severity === "CRITICAL" ? "var(--danger)" : "var(--warning)"}`,
                  color: "var(--text)",
                }}
                title={`${chip.tag} ${chip.severity} ${chip.risk}%`}
              >
                {chip.tag} {chip.severity} {chip.risk}% {chip.ageMin}m
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
