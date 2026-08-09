import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AreaChart,
  Area,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useSocket } from "../context/SocketContext";
import useReactorHistory from "../hooks/useReactorHistory";
import ReactorCard from "../components/ReactorCard";
import AlertFeed from "../components/AlertFeed";

function Home() {
  const { reactors, alerts } = useSocket();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const warningCount = reactors.filter((r) => r.status === "WARNING").length;
  const criticalCount = reactors.filter((r) => r.status === "CRITICAL").length;
  const safeCount = reactors.filter((r) => r.status === "SAFE").length;

  const aggregatePills = [
    { label: "SAFE", count: safeCount, color: "var(--success)" },
    { label: "WARNING", count: warningCount, color: "var(--warning)" },
    { label: "CRITICAL", count: criticalCount, color: "var(--danger)" },
  ];

  const sortedReactors = [...reactors].sort(
    (a, b) => b.risk_score - a.risk_score,
  );
  const topReactor = sortedReactors[0];
  const highestRisk = topReactor ? topReactor.risk_score : 0;
  const highestStatus = topReactor ? topReactor.status : "SAFE";

  const activeAlerts = alerts.filter((a) => !a.resolved).length;

  const { history: chartData } = useReactorHistory(
    topReactor ? topReactor.reactor_id : "A",
    {
      liveReactor: topReactor,
      maxPoints: 20,
      format: (d) => ({
        time: new Date(d.timestamp || Date.now()).toLocaleTimeString(),
        risk: d.risk_score,
      }),
    },
  );

  const statCards = [
    { label: "Total Reactors", value: reactors.length, color: "var(--accentLight)" },
    { label: "Active Alerts", value: activeAlerts, color: "var(--danger)" },
    {
      label: "Highest Risk",
      value: `${highestRisk}%`,
      color:
        highestStatus === "SAFE"
          ? "var(--success)"
          : highestStatus === "WARNING"
            ? "var(--warning)"
            : "var(--danger)",
    },
    {
      label: "System Status",
      value: criticalCount > 0 ? "CRITICAL" : warningCount > 0 ? "WARNING" : "HEALTHY",
      color: criticalCount > 0 ? "var(--danger)" : warningCount > 0 ? "var(--warning)" : "var(--success)",
    },
  ];

  return (
    <div>
      {/* Header — command center */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
            Plant Overview
          </h1>
          <p className="mt-1" style={{ color: "var(--textSub)" }}>
            Real-time thermal runaway prevention — {reactors.length} reactors monitored
          </p>
        </div>

        {/* Aggregate status pills */}
        <div className="flex items-center gap-2">
          {aggregatePills.map((p) => (
            <span
              key={p.label}
              className="text-[11px] font-bold px-3 py-1 rounded-full flex items-center gap-1.5"
              style={{ backgroundColor: p.color, color: "#fff" }}
            >
              {p.count} {p.label}
            </span>
          ))}
        </div>

        {/* Live clock */}
        <div className="text-right">
          <p className="text-2xl font-bold tabular-nums" style={{ color: "var(--text)" }}>
            {now.toLocaleTimeString()}
          </p>
          <p className="text-xs" style={{ color: "var(--textMuted)" }}>
            {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-5 mb-8">
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

      {/* Trend chart */}
      <div
        className="p-5 mb-8"
        style={{
          backgroundColor: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 12,
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold" style={{ color: "var(--text)" }}>
            Risk Trend
          </h3>
          {topReactor && (
            <span className="text-xs" style={{ color: "var(--textSub)" }}>
              Reactor {topReactor.reactor_id}
            </span>
          )}
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.5} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="time"
              tick={{ fill: "var(--textMuted)", fontSize: 11 }}
              stroke="var(--border)"
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "var(--textMuted)", fontSize: 11 }}
              stroke="var(--border)"
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                color: "var(--text)",
              }}
            />
            <Area
              type="monotone"
              dataKey="risk"
              stroke="var(--accent)"
              strokeWidth={2}
              fill="url(#riskGradient)"
            />
            <Line
              type="monotone"
              dataKey="avg"
              stroke="var(--highlight)"
              strokeDasharray="5 5"
              dot={false}
              strokeWidth={1.5}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Reactor grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {sortedReactors.length === 0 ? (
          <div
            className="p-8 text-center text-sm col-span-full"
            style={{
              backgroundColor: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              color: "var(--textSub)",
            }}
          >
            Waiting for reactor data...
          </div>
        ) : (
          sortedReactors.map((reactor) => (
            <ReactorCard
              key={reactor.reactor_id}
              reactor={reactor}
              onClick={() => navigate(`/reactor/${reactor.reactor_id}`)}
            />
          ))
        )}
      </div>

      {/* Live alert feed */}
      <div className="mt-8">
        <AlertFeed
          alerts={alerts}
          onSelect={(id) => navigate(`/reactor/${id}`)}
          onViewAll={() => navigate("/alerts")}
        />
      </div>
    </div>
  );
}

export default Home;
