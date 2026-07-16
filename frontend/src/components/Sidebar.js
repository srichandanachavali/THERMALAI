import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useSocket } from "../context/SocketContext";

function Sidebar() {
  const location = useLocation();
  const { alerts, connected } = useSocket();

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
    { path: "/", label: "Home" },
    { path: "/alerts", label: "Alerts" },
    { path: "/analytics", label: "Analytics" },
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
        <h1 className="text-xl font-bold text-white tracking-tight">
          ThermalAI
        </h1>
        <p className="text-gray-500 text-xs mt-1">Thermal Runaway Prevention</p>
        <div className="flex items-center gap-2 mt-3">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              connected ? "bg-green-400" : "bg-red-400"
            }`}
          ></div>
          <span className="text-xs text-gray-500">
            {connected ? "Live" : "Disconnected"}
          </span>
        </div>
      </div>

      {/* Plant info */}
      {plant && (
        <div className="px-4 py-3 border-b border-gray-700">
          <p className="text-gray-500 text-xs uppercase tracking-wider font-semibold mb-1">
            Active Plant
          </p>
          <p className="text-white text-sm font-semibold">{plant.name}</p>
          {plant.city && (
            <p className="text-gray-400 text-xs mt-0.5">
              {plant.city}, {plant.state}
            </p>
          )}
        </div>
      )}

      {/* User info */}
      {user && user.role && (
        <div className="px-4 py-3 border-b border-gray-700">
          <p className="text-white text-sm font-semibold">{user.name}</p>
          <span
            className={`text-xs font-semibold uppercase tracking-wider ${
              user.role === "admin" ? "text-purple-400" : "text-blue-400"
            }`}
          >
            {user.role}
          </span>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center justify-between px-4 py-2.5 rounded-lg mb-1 transition-colors text-sm font-medium ${
              location.pathname === item.path
                ? "bg-green-600 text-white"
                : "text-gray-400 hover:bg-gray-700 hover:text-white"
            }`}
          >
            <span>{item.label}</span>
            {item.label === "Alerts" && unreadCritical > 0 && (
              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
                {unreadCritical}
              </span>
            )}
          </Link>
        ))}

        {user.role === "admin" && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1 px-1">
              Admin
            </p>
            <p className="text-gray-500 text-xs px-1">
              Simulate runaway on reactor pages
            </p>
          </div>
        )}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="w-full text-gray-400 hover:text-white hover:bg-gray-700 text-sm py-2 px-3 rounded-lg transition-colors text-left mb-2"
        >
          Logout
        </button>
        <p className="text-gray-600 text-xs text-center">v1.0.0</p>
      </div>
    </div>
  );
}

export default Sidebar;
