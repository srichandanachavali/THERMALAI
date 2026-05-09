import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';

function Sidebar() {
  const location = useLocation();
  const { alerts, connected } = useSocket();

  const unreadCritical = alerts.filter(a => a.alert_type === 'CRITICAL').length;

  const navItems = [
    { path: '/', label: 'Home', icon: '🏠' },
    { path: '/alerts', label: 'Alerts', icon: '🚨' },
    { path: '/analytics', label: 'Analytics', icon: '📊' },
  ];

  return (
    <div className="fixed left-0 top-0 h-full w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
      
      {/* Logo */}
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-2xl font-bold text-green-400">ThermalAI 🔥</h1>
        <p className="text-gray-400 text-xs mt-1">Thermal Runaway Prevention</p>
        <div className="flex items-center gap-2 mt-3">
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <span className="text-xs text-gray-400">
            {connected ? 'Live Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 p-4">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center justify-between gap-3 px-4 py-3 rounded-lg mb-2 transition-all ${
              location.pathname === item.path
                ? 'bg-green-500 text-white'
                : 'text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-3">
              <span>{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </div>
            {item.label === 'Alerts' && unreadCritical > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                {unreadCritical}
              </span>
            )}
          </Link>
        ))}
      </nav>

      {/* Bottom */}
      <div className="p-4 border-t border-gray-700">
        <p className="text-gray-500 text-xs text-center">
          ThermalAI v1.0 — Hackathon Edition
        </p>
      </div>
    </div>
  );
}

export default Sidebar;