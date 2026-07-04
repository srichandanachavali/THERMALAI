# UI/UX Design Brief

## Aesthetic Direction
Dark industrial control room aesthetic — deep blacks and charcoal backgrounds with high-contrast alert colors. Designed to be readable in low-light control room environments. Data-dense layout with clear visual hierarchy for operators who need to scan multiple reactor states at a glance.

## Color Palette
- Background: dark (black/charcoal, inferred from App.css dark theme)
- SAFE: green tones
- WARNING: yellow/amber tones
- CRITICAL: red tones (high contrast for urgency)
- Accent/UI elements: inferred from Tailwind config (neutral dark theme)
- Text: white / light gray on dark backgrounds

## Typography
- System-ui / sans-serif (React default)
- Tailwind CSS typography utilities for sizing and weight
- Monospace for sensor values (temperature readings, risk scores)

## Component Style
- Cards: dark-background metric cards with colored borders indicating risk level
- Gauges: circular RiskGauge component (0–100) with color zones
- Heatmap: ReactorHeatmap grid showing multiple reactors with color intensity
- Alert feed: vertical list with colored severity badges (red/yellow/green)
- Sidebar: dark vertical navigation panel

## Dark / Light Mode
Dark mode only — the entire application uses a dark theme appropriate for industrial control room use. No light mode toggle is implemented.

## Reference Apps
- Grafana (monitoring dashboards with dark theme, multi-panel data display)
- PagerDuty (alert management with severity color coding)
- Datadog (real-time metric cards with trend charts)

## Key UI Patterns
- **MetricCard** — displays single sensor value (temperature, pressure, cooling efficiency, reaction rate) with trend indicator
- **RiskGauge** — circular gauge component with animated needle, color zones (green/yellow/red)
- **AlertFeed** — scrollable real-time alert list, newest first, with resolve button
- **ReactorHeatmap** — grid of reactors color-coded by risk score intensity
- **PredictionTimeline** — time-series chart of historical risk scores
- **ExplainPanel** — horizontal bar chart showing feature importance from ML model
- **AIComparison** — side-by-side RF score vs LSTM score with ensemble formula
- **MaintenancePanel** — time-to-critical countdown with recommended maintenance actions
- **CountdownTimer** — animated countdown display for maintenance time estimate
- **Sidebar** — persistent left sidebar with plant/reactor navigation and alert count badge

## Mobile Responsiveness
Not a primary design target — intended for desktop control room monitors. Tailwind CSS responsive utilities are available but the UI is optimized for wide-screen desktop displays where multiple metric panels are visible simultaneously.

## Accessibility
- High-contrast color coding for SAFE/WARNING/CRITICAL states
- Alert sounds not yet implemented (visual-only alerts in current version)
- Color alone is supplemented by text labels (SAFE, WARNING, CRITICAL) for colorblind operators
- Keyboard navigation not specifically implemented beyond browser defaults
