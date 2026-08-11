import React from "react";

// ISA-18.2 Alarm Rationalization priority badge, styled with HMI status
// classes. P1 is the only pulsing/red treatment (immediate action).
const PRIORITY = {
  "P1": { label: "P1 IMMEDIATE", cls: "status-critical" },
  "P2": { label: "P2 PROMPT", cls: "status-warning" },
  "P3": { label: "P3 DELAYED", cls: "status-nominal" },
};

function AlarmPriorityBadge({ priority, is_flood_notification = false }) {
  const level = PRIORITY[priority] || PRIORITY["P3"];

  return (
    <div className="flex items-center gap-2">
      {priority && (
        <span className={`${level.cls} inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold`}>
          {level.label}
        </span>
      )}
      {is_flood_notification && (
        <span className="alarm-flood-tag" title="Flood suppressed — >5 alarms in 5min">
          FLOOD
        </span>
      )}
    </div>
  );
}

export default AlarmPriorityBadge;
