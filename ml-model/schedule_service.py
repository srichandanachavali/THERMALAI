"""Maintenance scheduling: project days-to-service per component from history."""

from datetime import datetime, timedelta, timezone

import numpy as np
from sklearn.linear_model import LinearRegression

# Seconds between consecutive readings (5s per the ML ingest cadence).
SECONDS_PER_READING = 5
READINGS_PER_DAY = 86400 / SECONDS_PER_READING
MIN_HEALTH = 20.0  # service point floor used in the days-to-service projection

# Each component maps to a signal (field) + how to translate a reading into a
# 0-100 health score (higher = healthier). Component ordering is the display order.
COMPONENT_SIGNALS = {
    'cooling_system': {
        'field': 'cooling_efficiency',
        'health': lambda v: float(np.clip(v * 100, 0, 100)),
    },
    'pressure_vessel': {
        'field': 'pressure',
        'health': lambda v: float(np.clip((8.0 - v) / 8.0 * 100, 0, 100)),
    },
    'reaction_controller': {
        'field': 'reaction_rate',
        'health': lambda v: float(np.clip((1.0 - v) * 100, 0, 100)),
    },
    'temperature_sensors': {
        'field': 'temperature',
        'health': lambda v: float(np.clip((162.0 - v) / 162.0 * 100, 0, 100)),
    },
}

# Fallback action text when the trend is not clearly degrading.
_NOMINAL_ACTION = 'No action required — component within nominal range'

_RECOMMENDATIONS = {
    'cooling_system': 'Inspect cooling pump, check coolant levels, clean heat exchangers',
    'pressure_vessel': 'Test relief valve, check for blockages, inspect seals',
    'reaction_controller': 'Calibrate controller, check catalyst levels',
    'temperature_sensors': 'Calibrate sensors, verify thermocouple seating',
}


def _component_action(name, urgency, days):
    if urgency == 'nominal':
        return _NOMINAL_ACTION
    if urgency == 'immediate':
        return f'{_RECOMMENDATIONS[name]} — schedule within {days:.0f} day(s)'
    if urgency == 'soon':
        return f'{_RECOMMENDATIONS[name]} — plan work in next {days:.0f} days'
    return f'{_RECOMMENDATIONS[name]} — add to next scheduled window ({days:.0f} days)'


def build_schedule(reactor_id, history):
    """Return an actionable maintenance window per component.

    history: list of readings with the component signal fields. Returns None
    when there is not enough data to project a trend.
    """
    if not reactor_id:
        return {'error': 'reactor_id is required'}
    if len(history) < 5:
        return {
            'success': False,
            'message': f'Need at least 5 readings to project maintenance, got {len(history)}'
        }

    components = []
    for name, sig in COMPONENT_SIGNALS.items():
        field = sig['field']
        raw = [r[field] for r in history if field in r]
        if len(raw) < 2:
            continue
        x = np.arange(len(raw)).reshape(-1, 1)
        model = LinearRegression()
        model.fit(x, raw)
        raw_slope = float(model.coef_[0])  # units per reading

        health_series = np.array([sig['health'](v) for v in raw])
        current_health = float(health_series[-1])
        # Health slope in points per reading.
        xh = np.arange(len(health_series)).reshape(-1, 1)
        hm = LinearRegression()
        hm.fit(xh, health_series)
        health_slope_per_reading = float(hm.coef_[0])
        if health_slope_per_reading < -0.0001:
            trend_direction = 'degrading'
        elif health_slope_per_reading > 0.0001:
            trend_direction = 'improving'
        else:
            trend_direction = 'stable'

        # Only a degrading trend degrades toward the service point; improving
        # or stable components are not projected for near-term service.
        if trend_direction == 'degrading':
            daily_degradation = max(0.01, abs(health_slope_per_reading) * READINGS_PER_DAY)
            days = max(0.0, (current_health - MIN_HEALTH) / daily_degradation)
            if days < 3:
                urgency = 'immediate'
            elif days < 14:
                urgency = 'soon'
            elif days <= 30:
                urgency = 'scheduled'
            else:
                urgency = 'nominal'
            estimated_days = round(days, 1)
        else:
            days = None
            urgency = 'nominal'
            estimated_days = None

        components.append({
            'name': name,
            'current_health_pct': round(current_health, 1),
            'trend_direction': trend_direction,
            'raw_slope_per_reading': round(raw_slope, 4),
            'estimated_days_to_service': estimated_days,
            'urgency': urgency,
            'recommended_action': _component_action(name, urgency, days),
        })

    if not components:
        return {'success': False, 'message': 'No component signals in history'}

    projected = [c['estimated_days_to_service'] for c in components
                 if c['estimated_days_to_service'] is not None]
    if projected:
        min_days = min(projected)
        next_shutdown = datetime.now(timezone.utc) + timedelta(days=min_days)
        next_shutdown_iso = next_shutdown.isoformat()
    else:
        min_days = None
        next_shutdown_iso = None

    # Confidence from how much history we have and how far out the nearest
    # window is — short projections over rich history are most trustworthy.
    n = len(history)
    if min_days is not None and n >= 100 and min_days < 30:
        confidence = 'high'
    elif n >= 40:
        confidence = 'medium'
    else:
        confidence = 'low'

    return {
        'success': True,
        'reactor_id': reactor_id,
        'generated_at': datetime.now(timezone.utc).isoformat(),
        'components': components,
        'next_recommended_shutdown': next_shutdown_iso,
        'confidence': confidence,
    }
