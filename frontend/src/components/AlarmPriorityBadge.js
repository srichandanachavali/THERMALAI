import React from "react";

/**
 * AlarmPriorityBadge - ISA-18.2 Alarm Rationalization badge
 * Priority levels:
 * - P1 (IMMEDIATE): 60s response required, red pulsing
 * - P2 (PROMPT): 5min response required, amber
 * - P3 (DELAYED): 10-30min response required, grey
 * Also shows "FLOOD" tag for flood-suppressed notifications
 */
function AlarmPriorityBadge({ priority, isFloodNotification = false }) {
  if (!priority && !isFloodNotification) return null;

  const priorityClass = {
    P1: 'alarm-p1',
    P2: 'alarm-p2',
    P3: 'alarm-p3',
  }[priority] || 'alarm-p3';

  const priorityLabel = {
    P1: 'P1 — IMMEDIATE',
    P2: 'P2 — PROMPT',
    P3: 'P3 — DELAYED',
  }[priority] || 'P3 — DELAYED';

  return (
    <div className="flex items-center gap-2">
      {priority && (
        <span className={`alarm-priority-badge ${priorityClass}`}>
          {priorityLabel}
        </span>
      )}
      {isFloodNotification && (
        <span className="alarm-flood-tag" title="Flood suppressed — >5 alarms in 5min">
          FLOOD
        </span>
      )}
    </div>
  );
}

export default AlarmPriorityBadge;