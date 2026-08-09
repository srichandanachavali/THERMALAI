import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useSocket } from "../context/SocketContext";
import { useTheme } from "../context/ThemeContext";
import {
  FiHome,
  FiBarChart2,
  FiAlertTriangle,
  FiLayers,
  FiActivity,
  FiSettings,
  FiMoon,
  FiSun,
  FiCpu,
} from "react-icons/fi";

function Sidebar() {
  const location = useLocation();
  const { alerts, connected } = useSocket();
  const { isDark, toggleTheme } = useTheme();

  function safeParse(key, fallback) {
    const raw = localStorage.getItem(key);
    if (!raw || raw === "undefined") return fallback;
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  const user = safeParse("thermalai_user", {});
  const plant = safeParse("thermalai_plant", null);
  const unreadCritical = alerts.filter(
    (a) => a.alert_type === "CRITICAL",
  ).length;

  const navItems = [
    { path: "/", label: "Home", icon: FiHome },
    { path: "/analytics", label: "Analytics", icon: FiBarChart2 },
    { path: "/alerts", label: "Alerts", icon: FiAlertTriangle, badge: unreadCritical },
    { path: "/plants", label: "Plants", icon: FiLayers },
    { path: "/settings", label: "Settings", icon: FiSettings },
  ];

  const active = (path) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(path);

  return (
    <div
      className="fixed left-0 top-0 h-full flex flex-col"
      style={{
        width: 220,
        backgroundColor: "var(--card)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Logo pill */}
      <div className="px-4 py-5" style={{ borderBottom: "1px solid var(--border)" }}>
        <div
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
          style={{ backgroundColor: "var(--accentGlow)" }}
        >
          <span
            className="flex items-center justify-center w-8 h-8 rounded-md"
            style={{ backgroundColor: "var(--accent)" }}
          >
            <FiCpu size={16} style={{ color: "#fff" }} />
          </span>
          <div>
            <p className="font-extrabold tracking-tight leading-none" style={{ color: "var(--text)", fontSize: 16 }}>
              ThermalAI
            </p>
            <div className="flex items-center gap-1 mt-1">
              <FiActivity size={10} style={{ color: connected ? "var(--success)" : "var(--danger)" }} />
              <span style={{ color: "var(--textMuted)", fontSize: 10 }}>
                {connected ? "Live" : "Offline"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Compact plant + user */}
      <div className="px-4 py-3 space-y-2" style={{ borderBottom: "1px solid var(--border)" }}>
        {plant && (
          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--textMuted)" }}>
              Plant
            </p>
            <p className="text-sm font-semibold truncate" style={{ color: "var(--text)" }}>
              {plant.name || plant.plant_id}
            </p>
          </div>
        )}
        {user && user.role && (
          <div>
            <p className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--textMuted)" }}>
              Operator
            </p>
            <p className="text-sm font-medium truncate" style={{ color: "var(--text)" }}>
              {user.name}
              <span
                className="ml-2 text-[10px] font-bold uppercase tracking-wider"
                style={{ color: user.role === "admin" ? "var(--accentLight)" : "var(--highlight)" }}
              >
                {user.role}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = active(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center gap-3 px-3 py-2.5 rounded-md mb-1 text-sm font-medium transition-colors"
              style={{
                borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent",
                backgroundColor: isActive ? "var(--accentGlow)" : "transparent",
                color: isActive ? "var(--text)" : "var(--textSub)",
              }}
              onMouseEnter={(e) => {
                if (!isActive) e.currentTarget.style.color = "var(--text)";
              }}
              onMouseLeave={(e) => {
                if (!isActive) e.currentTarget.style.color = "var(--textSub)";
              }}
            >
              <Icon size={17} style={{ color: isActive ? "var(--accentLight)" : "var(--textMuted)" }} />
              <span>{item.label}</span>
              {item.badge > 0 && (
                <span
                  className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: "var(--danger)", color: "#fff" }}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}

        {user.role === "admin" && (
          <div
            className="mt-4 pt-4 px-2 text-xs"
            style={{ borderTop: "1px solid var(--border)" }}
          >
            <p className="uppercase tracking-wider mb-1" style={{ color: "var(--textMuted)" }}>
              Admin
            </p>
            <p style={{ color: "var(--textMuted)" }}>
              Simulate runaway on reactor pages
            </p>
          </div>
        )}
      </nav>

      {/* Bottom: theme toggle + version */}
      <div className="p-3" style={{ borderTop: "1px solid var(--border)" }}>
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors mb-1"
          style={{ color: "var(--textSub)", backgroundColor: "transparent" }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--accentGlow)")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
        >
          {isDark ? <FiSun size={16} style={{ color: "var(--highlight)" }} /> : <FiMoon size={16} />}
          <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
        </button>
        <p className="text-[10px] text-center mt-1" style={{ color: "var(--textMuted)" }}>
          ThermalAI v1.1.0
        </p>
      </div>
    </div>
  );
}

export default Sidebar;
