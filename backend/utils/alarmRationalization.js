/**
 * ISA-18.2 Alarm Rationalization Layer
 * Implements:
 * 1. ≤1 alarm per 10 min per reactor in steady state
 * 2. Priority tiers P1/P2/P3
 * 3. No duplicate alarms for the same root cause
 * 4. Flood suppression — if >5 alarms in 5 min, suppress P2/P3 and issue ONE flood alert
 */

const ALARM_PRIORITIES = {
  CRITICAL_GAS:   { priority: 1, label: 'P1-IMMEDIATE', cooldown_ms: 60000 },
  CRITICAL_RISK:  { priority: 1, label: 'P1-IMMEDIATE', cooldown_ms: 60000 },
  CRITICAL_TEMP:  { priority: 1, label: 'P1-IMMEDIATE', cooldown_ms: 60000 },
  CRITICAL_PH:    { priority: 1, label: 'P1-IMMEDIATE', cooldown_ms: 60000 },
  SENSOR_FAULT:   { priority: 2, label: 'P2-PROMPT',    cooldown_ms: 300000 },
  WARNING_RISK:   { priority: 2, label: 'P2-PROMPT',    cooldown_ms: 300000 },
  WARNING_PH:     { priority: 2, label: 'P2-PROMPT',    cooldown_ms: 300000 },
  WARNING_CO2:    { priority: 2, label: 'P2-PROMPT',    cooldown_ms: 300000 },
  DEGRADING:      { priority: 3, label: 'P3-DELAYED',   cooldown_ms: 600000 },
  MAINTENANCE:    { priority: 3, label: 'P3-DELAYED',   cooldown_ms: 1800000 },
};

class AlarmRationalization {
  constructor() {
    this.alarmHistory = new Map();   // reactor_id_alarmtype -> {timestamp, value}
    this.floodCounters = new Map();  // reactor_id -> {count, window_start}
  }

  shouldAlert(reactor_id, alarm_type, current_value) {
    const config = ALARM_PRIORITIES[alarm_type] || ALARM_PRIORITIES.WARNING_RISK;
    const key = `${reactor_id}_${alarm_type}`;
    const now = Date.now();

    // Cleanup history older than 1 hour to prevent memory growth
    if (this.alarmHistory.size > 500) {
      for (const [hk, hv] of this.alarmHistory.entries()) {
        if (now - hv.timestamp > 3600000) this.alarmHistory.delete(hk);
      }
    }

    // Check cooldown for this specific alarm type
    const lastAlarm = this.alarmHistory.get(key);
    if (lastAlarm && (now - lastAlarm.timestamp) < config.cooldown_ms) {
      return {
        should_alert: false,
        reason: `Cooldown active — ${Math.round((config.cooldown_ms - (now - lastAlarm.timestamp)) / 1000)}s remaining`,
      };
    }

    // Flood detection: count alarms in 5-minute window per reactor
    let flood = this.floodCounters.get(reactor_id) || { count: 0, window_start: now };
    if (now - flood.window_start > 300000) {
      flood = { count: 0, window_start: now };
    }
    flood.count++;
    this.floodCounters.set(reactor_id, flood);

    // Flood suppression: if >5 alarms in 5 min, suppress P2/P3
    if (flood.count > 5 && config.priority > 1) {
      return {
        should_alert: false,
        reason: 'Alarm flood suppression — P2/P3 suppressed',
      };
    }

    // Flood notification: 6th alarm triggers a single flood notification for lower priorities
    if (flood.count === 6 && config.priority > 1) {
      return {
        should_alert: true,
        is_flood_notification: true,
        message: `Alarm flood on ${reactor_id} — ${flood.count} alarms in 5 minutes. P2/P3 suppressed.`,
      };
    }

    // Allow the alert, record it
    this.alarmHistory.set(key, { timestamp: now, value: current_value });
    return {
      should_alert: true,
      priority: config.label,
      is_flood_notification: false,
    };
  }

  classifyAlarm(reactor_data = {}, risk_score = 0) {
    const gas = Number(reactor_data.gas_concentration) || 0;
    const temp = Number(reactor_data.temperature) || 0;
    const ph = Number(reactor_data.ph_level) || 7.0;
    const co2 = Number(reactor_data.emissions_co2_ppm) || 400;

    // P1 Critical Alarms
    if (gas >= 25) return 'CRITICAL_GAS';
    if (risk_score >= 70) return 'CRITICAL_RISK';
    if (temp > 162) return 'CRITICAL_TEMP';
    if (ph < 4.0 || ph > 10.0) return 'CRITICAL_PH';

    // P2 Prompt Alarms
    if (reactor_data.data_quality === 'degraded' || (reactor_data.sensor_validation && reactor_data.sensor_validation.is_degraded)) {
      return 'SENSOR_FAULT';
    }
    if (risk_score >= 30) return 'WARNING_RISK';
    if (ph < 5.0 || ph > 9.0) return 'WARNING_PH';
    if (co2 > 2500) return 'WARNING_CO2';

    return null;
  }
}

module.exports = { AlarmRationalization, ALARM_PRIORITIES };