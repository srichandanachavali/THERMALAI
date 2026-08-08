import React from "react";

function EnterpriseSummary({ plants, safeCount, warningCount, criticalCount }) {
  return (
    <div className="grid grid-cols-4 gap-6 mb-8">
      <div className="bg-gray-800 border-l-4 border-blue-500 rounded-lg p-6">
        <p className="text-gray-400 text-sm uppercase tracking-wide">Total Plants</p>
        <p className="text-4xl font-bold text-blue-400 mt-2">{plants.length}</p>
        <p className="text-gray-500 text-sm mt-1">Across India</p>
      </div>
      <div className="bg-gray-800 border-l-4 border-green-500 rounded-lg p-6">
        <p className="text-gray-400 text-sm uppercase tracking-wide">Safe Reactors</p>
        <p className="text-4xl font-bold text-green-400 mt-2">{safeCount}</p>
        <p className="text-gray-500 text-sm mt-1">Operating normally</p>
      </div>
      <div className="bg-gray-800 border-l-4 border-yellow-500 rounded-lg p-6">
        <p className="text-gray-400 text-sm uppercase tracking-wide">Warnings</p>
        <p className="text-4xl font-bold text-yellow-400 mt-2">{warningCount}</p>
        <p className="text-gray-500 text-sm mt-1">Need attention</p>
      </div>
      <div className="bg-gray-800 border-l-4 border-red-500 rounded-lg p-6">
        <p className="text-gray-400 text-sm uppercase tracking-wide">Critical</p>
        <p className="text-4xl font-bold text-red-400 mt-2">{criticalCount}</p>
        <p className="text-gray-500 text-sm mt-1">Immediate action!</p>
      </div>
    </div>
  );
}

export default EnterpriseSummary;
