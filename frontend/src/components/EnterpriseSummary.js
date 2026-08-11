import React from "react";

function EnterpriseSummary({ plants, safeCount, warningCount, criticalCount }) {
  return (
    <div className="grid grid-cols-4 gap-6 mb-8">
      <div className="border-l-4 border-blue-500 rounded-lg p-6" style={{ backgroundColor: "var(--card)" }}>
        <p className="text-sm uppercase tracking-wide" style={{ color: "var(--text-sub)" }}>Total Plants</p>
        <p className="text-4xl font-bold text-blue-400 mt-2">{plants.length}</p>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Across India</p>
      </div>
      <div className="border-l-4 border-green-500 rounded-lg p-6" style={{ backgroundColor: "var(--card)" }}>
        <p className="text-sm uppercase tracking-wide" style={{ color: "var(--text-sub)" }}>Safe Reactors</p>
        <p className="text-4xl font-bold text-green-400 mt-2">{safeCount}</p>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Operating normally</p>
      </div>
      <div className="border-l-4 border-yellow-500 rounded-lg p-6" style={{ backgroundColor: "var(--card)" }}>
        <p className="text-sm uppercase tracking-wide" style={{ color: "var(--text-sub)" }}>Warnings</p>
        <p className="text-4xl font-bold text-yellow-400 mt-2">{warningCount}</p>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Need attention</p>
      </div>
      <div className="border-l-4 border-red-500 rounded-lg p-6" style={{ backgroundColor: "var(--card)" }}>
        <p className="text-sm uppercase tracking-wide" style={{ color: "var(--text-sub)" }}>Critical</p>
        <p className="text-4xl font-bold text-red-400 mt-2">{criticalCount}</p>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>Immediate action!</p>
      </div>
    </div>
  );
}

export default EnterpriseSummary;
