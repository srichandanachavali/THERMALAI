import React from 'react';


function MetricCard({ title, value, subtitle, color }) {
  const colorMap = {
    green: 'border-green-500 text-green-400',
    yellow: 'border-yellow-500 text-yellow-400',
    red: 'border-red-500 text-red-400',
    blue: 'border-blue-500 text-blue-400',
  };

  return (
    <div className={`bg-gray-800 border-l-4 ${colorMap[color]} rounded-lg p-6`}>
      <p className="text-gray-400 text-sm uppercase tracking-wide">{title}</p>
      <p className={`text-4xl font-bold mt-2 ${colorMap[color].split(' ')[1]}`}>
        {value}
      </p>
      {subtitle && (
        <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
      )}
    </div>
  );
}

export default MetricCard;