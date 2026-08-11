// ThermalAI design tokens — Hixio-style dark dashboard palette.
// Single source of truth for colors; consumed by ThemeContext.

export const dark = {
  bg: '#0d0f1a',
  card: '#1a1d35',
  border: '#2a2d4a',
  accent: '#7c3aed',
  accentLight: '#a855f7',
  accentGlow: 'rgba(124, 58, 237, 0.15)',
  highlight: '#f59e0b',
  text: '#f1f5f9',
  textSub: '#94a3b8',
  textMuted: '#475569',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  // ASM HMI additional variables
  successBg: 'rgba(34, 197, 94, 0.1)',
  warningBg: 'rgba(245, 158, 11, 0.12)',
  dangerBg: 'rgba(239, 68, 68, 0.12)',
};

export const light = {
  bg: '#f8fafc',
  card: '#ffffff',
  border: '#e2e8f0',
  accent: '#7c3aed',
  accentLight: '#a855f7',
  accentGlow: 'rgba(124, 58, 237, 0.08)',
  highlight: '#f59e0b',
  text: '#0f172a',
  textSub: '#475569',
  textMuted: '#94a3b8',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  // ASM HMI additional variables
  successBg: 'rgba(22, 163, 74, 0.1)',
  warningBg: 'rgba(217, 119, 6, 0.12)',
  dangerBg: 'rgba(220, 38, 38, 0.12)',
};

// Maps each palette key to the CSS variable name applied on :root.
// Use kebab-case to match global.css references.
export const themeCssVars = {
  bg: '--bg',
  card: '--card',
  border: '--border',
  accent: '--accent',
  accentLight: '--accent-light',
  accentGlow: '--accent-glow',
  highlight: '--highlight',
  text: '--text',
  textSub: '--text-sub',
  textMuted: '--text-muted',
  success: '--success',
  warning: '--warning',
  danger: '--danger',
  successBg: '--success-bg',
  warningBg: '--warning-bg',
  dangerBg: '--danger-bg',
};
