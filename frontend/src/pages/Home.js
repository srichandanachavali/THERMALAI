import React, { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FiAlertCircle, FiActivity } from "react-icons/fi";
import { useSocket } from "../context/SocketContext";
import ReactorCard from "../components/ReactorCard";
import { ReactorCardSkeleton } from "../components/Skeletons";
import { REACTOR_CONFIG, getReactorConfig } from "../constants/reactors";

// Level 1 (OVERVIEW) priority — CRITICAL floats to top, then WARNING,
// DEGRADING, NOMINAL/SAFE, then RECOVERY; highest risk first within band.
const STATUS_ORDER = {
  CRITICAL: 0,
  WARNING: 1,
  DEGRADING: 2,
  NOMINAL: 3,
  SAFE: 3,
  RECOVERY: 4,
};

// Card-level HMI accent (left border) driven by the reactor's status.
const CARD_STATUS_CLASS = {
  CRITICAL: "reactor-card-critical",
  DEGRADING: "reactor-card-degrading",
  WARNING: "reactor-card-warning",
  NOMINAL: "reactor-card-nominal",
  SAFE: "reactor-card-nominal",
  RECOVERY: "reactor-card-nominal",
};

// All 5 reactors default fallback definitions
const ALL_REACTOR_IDS = Object.keys(REACTOR_CONFIG);

function Home() {
  const { reactors: socketReactors, alerts, connected } = useSocket();
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

  // Guarantee all 5 reactors (R-101, R-102, R-201, R-202, R-301) are present
  const allReactors = useMemo(() => {
    const liveMap = new Map((socketReactors || []).map((r) => [r.reactor_id, r]));

    return ALL_REACTOR_IDS.map((id) => {
      if (liveMap.has(id)) {
        return liveMap.get(id);
      }
      const config = REACTOR_CONFIG[id];
      return {
        reactor_id: id,
        name: config.name,
        plant_id: config.plant_id,
        tag: config.tag,
        temperature: config.baseline_temp ?? 65.0,
        pressure: config.baseline_pressure ?? 1.2,
        cooling_efficiency: 0.95,
        reaction_rate: 0.5,
        flow_rate: 150.0,
        material_level: 75.0,
        gas_concentration: 0.0,
        ph_level: 7.0,
        emissions_co2_ppm: 400.0,
        risk_score: 5.0,
        status: "SAFE",
        timestamp: new Date(),
      };
    });
  }, [socketReactors]);

  const safeCount = allReactors.filter((r) => r.status === "SAFE" || r.status === "NOMINAL").length;
  const warningCount = allReactors.filter((r) => r.status === "WARNING" || r.status === "DEGRADING").length;
  const criticalCount = allReactors.filter((r) => r.status === "CRITICAL").length;

  const statCards = [
    { label: "Total Fleet", value: allReactors.length, color: "var(--accent-light, #60a5fa)" },
    { label: "Safe / Nominal", value: safeCount, color: "var(--success, #10b981)" },
    { label: "Warning / Degraded", value: warningCount, color: "var(--warning, #f59e0b)" },
    { label: "Critical Risk", value: criticalCount, color: "var(--danger, #ef4444)" },
  ];

  const sortedReactors = useMemo(() => {
    return [...allReactors].sort((a, b) => {
      const oa = STATUS_ORDER[a.status] ?? 4;
      const ob = STATUS_ORDER[b.status] ?? 4;
      if (oa !== ob) return oa - ob;
      return (b.risk_score || 0) - (a.risk_score || 0);
    });
  }, [allReactors]);

  // Data-source pill — Live Stream / Simulation / Initializing.
  const dataSource = (() => {
    if (!connected && socketReactors.length === 0) {
      return { Icon: FiAlertCircle, label: "Offline / Pre-Stream", color: "var(--danger)" };
    }
    return { Icon: FiActivity, label: "Live Telemetry Mode", color: "#3b82f6" };
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text)" }}>
            Enterprise Fleet Overview
          </h1>
          <p className="text-sm" style={{ color: "var(--text-sub)" }}>
            Real-time thermal runaway prevention — {allReactors.length} continuous reactors monitored across 3 plant sites
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Data source indicator */}
          <button
            onClick={() => navigate("/settings")}
            title="Data source — click to open Settings"
            className="flex items-center gap-2 text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
            style={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              color: "var(--text)",
            }}
          >
            <DataIcon size={14} aria-hidden="true" style={{ color: dataSource.color }} />
            <span>{dataSource.label}</span>
          </button>

          {/* Live clock */}
          <div className="text-right" role="status" aria-live="polite">
            <p className="text-xl font-bold tabular-nums" style={{ color: "var(--text)" }}>
              {now.toLocaleTimeString()}
            </p>
            <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {now.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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
            <p className="text-xs uppercase tracking-wider font-semibold" style={{ color: "var(--text-sub)" }}>
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
              className="p-8 col-span-full text-center"
              style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}
            >
              <p className="font-semibold mb-1" style={{ color: "var(--text-sub)" }}>
                Waiting for stream telemetry...
              </p>
              <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                Ensure telemetry stream Python service is active:
              </p>
              <pre style={{ backgroundColor: "var(--bg)", color: "var(--success)", padding: "1rem", borderRadius: 8, overflowX: "auto" }}>
                python stream_data.py
              </pre>
            </div>
          ) : (
            <div
              className="p-8 text-center text-sm col-span-full"
              style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, color: "var(--text-sub)" }}
            >
              Connecting to Gateway...
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
                statusClass={CARD_STATUS_CLASS[reactor.status] || "reactor-card-nominal"}
                onClick={() => navigate(`/reactor/${reactor.reactor_id}`)}
              />
            </div>
          ))
        )}
      </div>

      {/* Status summary strip — last 10 alerts */}
      {alertChips.length > 0 && (
        <div
          className="mt-8 p-5"
          style={{ backgroundColor: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "var(--text-sub)" }}>
            Recent Active Fleet Alerts
          </p>
          <div className="flex flex-wrap gap-2">
            {alertChips.map((chip) => (
              <button
                key={chip._id}
                onClick={() => navigate(`/reactor/${chip.reactor_id}`)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                  chip.severity === "CRITICAL"
                    ? "bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20"
                    : "bg-yellow-500/10 border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/20"
                }`}
                title={`${chip.tag} ${chip.severity} ${chip.risk}%`}
              >
                {chip.tag} • {chip.severity} ({chip.risk}%) • {chip.ageMin}m ago
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;