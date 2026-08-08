"""Tests for the actionable maintenance-window scheduler."""

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest

from schedule_service import build_schedule, COMPONENT_SIGNALS


def make_history(n, start_temp=90, dtemp=0.3, cooling=0.8, dcooling=0.002):
    """Build n readings; temperature rising (degrading) by default."""
    history = []
    for i in range(n):
        history.append({
            'timestamp': f'2026-08-09T00:00:00Z',
            'temperature': round(start_temp + i * dtemp, 2),
            'pressure': round(4.0 + i * 0.02, 3),
            'reaction_rate': round(0.5 + i * 0.002, 4),
            'cooling_efficiency': round(cooling - i * dcooling, 4),
            'risk_score': i,
        })
    return history


def test_requires_five_readings():
    result = build_schedule('A', make_history(4))
    assert result['success'] is False
    assert 'at least 5' in result['message']


def test_returns_all_four_components():
    result = build_schedule('A', make_history(50))
    assert result['success'] is True
    names = {c['name'] for c in result['components']}
    assert names == set(COMPONENT_SIGNALS.keys())
    for c in result['components']:
        assert c['trend_direction'] in ('degrading', 'stable', 'improving')
        assert c['urgency'] in ('immediate', 'soon', 'scheduled', 'nominal')
        assert 'recommended_action' in c
        assert 'current_health_pct' in c


def test_healthy_stable_history_is_nominal():
    history = [{'temperature': 105, 'pressure': 4.1, 'reaction_rate': 0.45,
                'cooling_efficiency': 0.85, 'risk_score': 10}] * 168
    result = build_schedule('B', history)
    for c in result['components']:
        assert c['trend_direction'] == 'stable'
        assert c['urgency'] == 'nominal'
        assert c['estimated_days_to_service'] is None


def test_degrading_history_projects_urgency():
    result = build_schedule('A', make_history(168))
    # Rising temperature degrades the temperature_sensors health quickly.
    temp = next(c for c in result['components'] if c['name'] == 'temperature_sensors')
    assert temp['trend_direction'] == 'degrading'
    assert temp['estimated_days_to_service'] is not None
    assert temp['urgency'] in ('immediate', 'soon', 'scheduled')


def test_confidence_tiers_with_history_length():
    assert build_schedule('A', make_history(120))['confidence'] in ('high', 'medium')
    assert build_schedule('A', make_history(50))['confidence'] in ('medium', 'low')
