import React from "react";

function ReactorSelector({ reactorIds, selected, onSelect }) {
  return (
    <div className="flex gap-2">
      {reactorIds.map((rid) => (
        <button
          key={rid}
          onClick={() => onSelect(rid)}
          className={`px-4 py-2 rounded-lg font-bold transition-all ${
            selected === rid
              ? "bg-green-500 text-white"
              : "bg-gray-700 text-gray-400 hover:bg-gray-600"
          }`}
        >
          {rid}
        </button>
      ))}
    </div>
  );
}

export default ReactorSelector;
