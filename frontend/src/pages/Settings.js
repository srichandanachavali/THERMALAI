import React, { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";

const SETTINGS_KEY = "thermalai_settings";

const DEFAULT_SETTINGS = {
  notifications: { email: true, sms: true },
  thresholds: { warning: 30, critical: 70 },
  appearance: { theme: "dark" },
};

function safeParse(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw || raw === "undefined") return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function Settings() {
  const [settings, setSettings] = useState(() => ({
    ...DEFAULT_SETTINGS,
    ...safeParse(SETTINGS_KEY, {}),
  }));
  const [user] = useState(() => safeParse("thermalai_user", {}));
  const [plant] = useState(() => safeParse("thermalai_plant", null));
  const [saved, setSaved] = useState(false);
  const { isDark, toggleTheme } = useTheme();

  // Auto-save on any change, then flash a "Saved" toast.
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    setSaved(true);
    const t = setTimeout(() => setSaved(false), 1500);
    return () => clearTimeout(t);
  }, [settings]);

  const update = (section, key, value) =>
    setSettings((prev) => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }));

  const cardStyle = {
    backgroundColor: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: 20,
  };
  const labelStyle = { color: "var(--text)", fontWeight: 600, fontSize: 14 };
  const subStyle = { color: "var(--text-muted)", fontSize: 12 };

  const Toggle = ({ checked, onChange }) => (
    <button
      onClick={() => onChange(!checked)}
      className="relative w-11 h-6 rounded-full transition-colors"
      style={{ backgroundColor: checked ? "var(--accent)" : "var(--border)" }}
    >
      <span
        className="absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform"
        style={{ left: checked ? 22 : 2 }}
      />
    </button>
  );

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text)" }}>
            Settings
          </h1>
          <p className="mt-1" style={{ color: "var(--text-sub)" }}>
            Preferences are saved locally on this device
          </p>
        </div>
        {saved && (
          <span
            className="text-xs font-bold px-3 py-1 rounded-full"
            style={{ backgroundColor: "var(--success)", color: "#fff" }}
          >
            ✓ Saved
          </span>
        )}
      </div>

      {/* Profile */}
      <div className="mb-6" style={cardStyle}>
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "var(--accent-light)" }}>
          Profile
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="mb-1" style={labelStyle}>Name</p>
            <p style={subStyle}>{user.name || "—"}</p>
          </div>
          <div>
            <p className="mb-1" style={labelStyle}>Role</p>
            <p style={subStyle}>{user.role || "—"}</p>
          </div>
          <div className="col-span-2">
            <p className="mb-1" style={labelStyle}>Active Plant</p>
            <p style={subStyle}>
              {plant ? `${plant.name} (${plant.state})` : "No plant selected"}
            </p>
          </div>
        </div>
        <div className="mt-6 pt-5" style={{ borderTop: "1px solid var(--border)" }}>
          <button
            onClick={() => {
              localStorage.removeItem("thermalai_token");
              localStorage.removeItem("thermalai_user");
              localStorage.removeItem("thermalai_plant");
              window.location.href = "/select-plant";
            }}
            className="text-sm font-bold px-4 py-2 rounded-lg transition-colors"
            style={{ backgroundColor: "var(--danger)", color: "#fff" }}
          >
            Sign out
          </button>
        </div>
      </div>

      {/* Alerts & Notifications */}
      <div className="mb-6" style={cardStyle}>
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "var(--accent-light)" }}>
          Alerts & Notifications
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p style={labelStyle}>Email alerts</p>
              <p style={subStyle}>Receive critical alerts by email</p>
            </div>
            <Toggle
              checked={settings.notifications.email}
              onChange={(v) => update("notifications", "email", v)}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p style={labelStyle}>SMS alerts</p>
              <p style={subStyle}>Receive critical alerts by SMS</p>
            </div>
            <Toggle
              checked={settings.notifications.sms}
              onChange={(v) => update("notifications", "sms", v)}
            />
          </div>
        </div>
      </div>

      {/* Thresholds */}
      <div className="mb-6" style={cardStyle}>
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "var(--accent-light)" }}>
          Risk Thresholds
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1" style={labelStyle}>
              Warning threshold
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={settings.thresholds.warning}
              onChange={(e) =>
                update("thresholds", "warning", Number(e.target.value))
              }
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: "var(--bg)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            />
          </div>
          <div>
            <label className="block mb-1" style={labelStyle}>
              Critical threshold
            </label>
            <input
              type="number"
              min={0}
              max={100}
              value={settings.thresholds.critical}
              onChange={(e) =>
                update("thresholds", "critical", Number(e.target.value))
              }
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                backgroundColor: "var(--bg)",
                border: "1px solid var(--border)",
                color: "var(--text)",
              }}
            />
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div style={cardStyle}>
        <h2 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: "var(--accent-light)" }}>
          Appearance
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p style={labelStyle}>Dark mode</p>
            <p style={subStyle}>Switch between light and dark theme</p>
          </div>
          <Toggle checked={isDark} onChange={toggleTheme} />
        </div>
      </div>
    </div>
  );
}

export default Settings;
