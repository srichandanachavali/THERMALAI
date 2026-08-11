import React from "react";
import { getReactorConfig } from "../constants/reactors";

function ReactorSelector({ reactorIds, selected, onSelect }) {
  return (
    <div className="flex gap-2">
      {reactorIds.map((rid) => (
        <button
          key={rid}
          onClick={() => onSelect(rid)}
          title={getReactorConfig(rid).name}
          className={`px-4 py-2 rounded-lg font-bold transition-all ${
            selected === rid ? "bg-green-500" : "hover-surface"
          }`}
          style={
            selected === rid
              ? { color: "var(--text)" }
              : { backgroundColor: "var(--border)", color: "var(--text-sub)" }
          }
        >
          {getReactorConfig(rid).tag}
        </button>
      ))}
    </div>
  );
}

export default ReactorSelector;
