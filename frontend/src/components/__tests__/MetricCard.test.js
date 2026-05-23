import React from 'react';
import { render, screen } from '@testing-library/react';
import MetricCard from '../MetricCard';

// MetricCard props: title (label), value, subtitle, color ('green'|'yellow'|'red'|'blue')
// Color maps: yellow → WARNING, red → CRITICAL

describe('MetricCard', () => {
  it('renders the title (label) prop', () => {
    render(<MetricCard title="Total Reactors" value={5} color="blue" />);
    expect(screen.getByText('Total Reactors')).toBeInTheDocument();
  });

  it('renders the value prop', () => {
    render(<MetricCard title="Risk Score" value={42} color="yellow" />);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders the subtitle when provided', () => {
    render(
      <MetricCard title="Alerts" value={3} subtitle="Active alerts" color="red" />
    );
    expect(screen.getByText('Active alerts')).toBeInTheDocument();
  });

  it('does not render subtitle when omitted', () => {
    const { container } = render(
      <MetricCard title="Alerts" value={3} color="red" />
    );
    // Only one <p> for title and one for value — no subtitle paragraph.
    const paragraphs = container.querySelectorAll('p');
    expect(paragraphs).toHaveLength(2);
  });

  it('applies yellow (WARNING) border and text classes when color="yellow"', () => {
    const { container } = render(
      <MetricCard title="Status" value="WARNING" color="yellow" />
    );
    const card = container.firstChild;
    expect(card.className).toContain('border-yellow-500');
    expect(card.className).toContain('text-yellow-400');
  });

  it('applies red (CRITICAL) border and text classes when color="red"', () => {
    const { container } = render(
      <MetricCard title="Status" value="CRITICAL" color="red" />
    );
    const card = container.firstChild;
    expect(card.className).toContain('border-red-500');
    expect(card.className).toContain('text-red-400');
  });

  it('applies green classes when color="green"', () => {
    const { container } = render(
      <MetricCard title="Status" value="SAFE" color="green" />
    );
    const card = container.firstChild;
    expect(card.className).toContain('border-green-500');
    expect(card.className).toContain('text-green-400');
  });
});
