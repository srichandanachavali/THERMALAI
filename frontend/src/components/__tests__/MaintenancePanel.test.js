import React from 'react';
import { render, screen } from '@testing-library/react';
import MaintenancePanel from '../MaintenancePanel';

// The panel initializes with a hardcoded baseline RUL dataset so health bars render
// immediately (even before telemetry). The on-mount /maintenance fetch only replaces
// the baseline when it returns success — mock it to no-op so baseline state persists.

jest.mock('axios', () => ({
  get: jest.fn().mockResolvedValue({ data: { success: false } }),
}));

describe('MaintenancePanel', () => {
  it('renders the panel header', () => {
    render(<MaintenancePanel reactor={{ reactor_id: 'R-101' }} />);
    expect(screen.getByText('Predictive Maintenance')).toBeInTheDocument();
  });

  it('renders baseline overall health immediately without telemetry', () => {
    render(<MaintenancePanel reactor={{ reactor_id: 'R-101' }} />);
    expect(screen.getByText('86%')).toBeInTheDocument();
    expect(screen.getByText('HEALTHY')).toBeInTheDocument();
  });

  it('renders baseline component health bars immediately', () => {
    render(<MaintenancePanel reactor={{ reactor_id: 'R-101' }} />);
    expect(screen.getByText('Health: 87%')).toBeInTheDocument();
    expect(screen.getByText('Health: 94%')).toBeInTheDocument();
    expect(screen.getByText('Health: 78%')).toBeInTheDocument();
  });

  it('renders baseline RUL hours per component', () => {
    render(<MaintenancePanel reactor={{ reactor_id: 'R-101' }} />);
    expect(screen.getByText('RUL ~420 hrs')).toBeInTheDocument();
    expect(screen.getByText('RUL ~1120 hrs')).toBeInTheDocument();
    expect(screen.getByText('RUL ~240 hrs')).toBeInTheDocument();
  });
});
