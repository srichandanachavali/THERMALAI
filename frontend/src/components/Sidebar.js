import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useSocket } from "../context/SocketContext";

function Sidebar() {
  const location = useLocation();
  const { alerts, connected } = useSocket();

  const user = JSON.parse(localStorage.getItem("thermalai_user") || "{}");
  const plant = JSON.parse(localStorage.getItem("thermalai_plant") || "null");

  const unreadCritical = alerts.filter(
    (a) => a.alert_type === "CRITICAL",
  ).length;

  const navItems = [
    { path: "/", label: "Home", icon: "🏠" },
    { path: "/alerts", label: "Alerts", icon: "🚨" },
    { path: "/analytics", label: "Analytics", icon: "📊" },
  ];

  const handleLogout = () => {
    localStorage.removeItem("thermalai_token");
    localStorage.removeItem("thermalai_user");
    localStorage.removeItem("thermalai_plant");
    window.location.href = "/select-plant";
  };

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-2xl font-bold text-green-400">ThermalAI 🔥</h1>
        <p className="text-gray-400 text-xs mt-1">Thermal Runaway Prevention</p>
        <div className="flex items-center gap-2 mt-3">
          <div
            className={`w-2 h-2 rounded-full ${
              connected ? "bg-green-400" : "bg-red-400"
            }`}
          ></div>
          <span className="text-xs text-gray-400">
            {connected ? "Live Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      {/* Plant info */}
      {plant && (
        <div className="px-4 py-3 border-b border-gray-700">
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
            <p className="text-green-400 text-xs uppercase tracking-wide font-bold mb-0.5">
              🏭 Current Plant
            </p>
            <p className="text-white text-sm font-bold">{plant.name}</p>
            {plant.city && (
              <p className="text-gray-400 text-xs">
                📍 {plant.city}, {plant.state}
              </p>
            )}
          </div>
        </div>
      )}

      {/* User info */}
      {user && user.role && (
        <div className="px-4 py-3 border-b border-gray-700">
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              user.role === "admin" ? "bg-purple-500/10" : "bg-blue-500/10"
            }`}
          >
            <span>{user.role === "admin" ? "👑" : "👷"}</span>
            <div>
              <p className="text-white text-sm font-bold">{user.name}</p>
              <p
                className={`text-xs uppercase font-bold ${
                  user.role === "admin" ? "text-purple-400" : "text-blue-400"
                }`}
              >
                {user.role}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg mb-2 transition-all ${
              location.pathname === item.path
                ? "bg-green-500 text-white"
                : "text-gray-400 hover:bg-gray-700 hover:text-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <span>{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </div>
            {item.label === "Alerts" && unreadCritical > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {unreadCritical}
              </span>
            )}
          </Link>
        ))}

        {/* Admin only */}
        {user.role === "admin" && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-gray-500 text-xs uppercase tracking-wide mb-2 px-2">
              Admin Controls
            </p>
            <div className="px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-xs text-center">
                🔥 Simulate Runaway available on reactor pages
              </p>
            </div>
          </div>
        )}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="w-full bg-red-500/20 hover:bg-red-500/40 text-red-400 text-sm py-2 rounded-lg transition-all mb-2"
        >
          🚪 Logout
        </button>
        <p className="text-gray-500 text-xs text-center">ThermalAI v1.0</p>
      </div>
    </div>
  );
}

export default Sidebar;