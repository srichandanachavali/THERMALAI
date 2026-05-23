import React from 'react';
import { render, screen } from '@testing-library/react';
import RiskGauge from '../RiskGauge';

// RiskGauge props: score (0-100), status (string rendered as badge text)
// Color logic: score < 30 → green, 30-69 → yellow, ≥ 70 → red
// The status badge text comes from the `status` prop, not derived from score.

describe('RiskGauge', () => {
  it('renders without crashing', () => {
    const { container } = render(<RiskGauge score={50} status="WARNING" />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('displays the score percentage', () => {
    render(<RiskGauge score={42} status="WARNING" />);
    expect(screen.getByText('42%')).toBeInTheDocument();
  });

  it('displays "Risk Score" label', () => {
    render(<RiskGauge score={42} status="WARNING" />);
    expect(screen.getByText('Risk Score')).toBeInTheDocument();
  });

  it('shows SAFE status text when score < 30', () => {
    render(<RiskGauge score={15} status="SAFE" />);
    expect(screen.getByText('SAFE')).toBeInTheDocument();
  });

  it('shows WARNING status text when score is in the warning range', () => {
    render(<RiskGauge score={55} status="WARNING" />);
    expect(screen.getByText('WARNING')).toBeInTheDocument();
  });

  it('shows CRITICAL status text when score >= 70', () => {
    render(<RiskGauge score={85} status="CRITICAL" />);
    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
  });

  it('applies green background badge for safe score', () => {
    const { container } = render(<RiskGauge score={15} status="SAFE" />);
    // The status badge div has getBgColor() applied.
    const badge = container.querySelector('.bg-green-500');
    expect(badge).toBeInTheDocument();
  });

  it('applies yellow background badge for warning score', () => {
    const { container } = render(<RiskGauge score={55} status="WARNING" />);
    const badge = container.querySelector('.bg-yellow-500');
    expect(badge).toBeInTheDocument();
  });

  it('applies red background badge for critical score', () => {
    const { container } = render(<RiskGauge score={85} status="CRITICAL" />);
    const badge = container.querySelector('.bg-red-500');
    expect(badge).toBeInTheDocument();
  });

  it('renders an SVG gauge element', () => {
    const { container } = render(<RiskGauge score={50} status="WARNING" />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
