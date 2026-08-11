// ThermalAI reactor registry — ISA S5.1 process tags, plant attribution,
// and risk thresholds. Single source of truth for how reactor IDs (R-101…R-301)
// map to real equipment, so one change propagates across every view.

export const REACTOR_CONFIG = {
  'R-101': {
    tag: 'R-101',
    name: 'Nitration Train 1',
    process: 'Aromatic Nitration',
    plant: 'PLANT_ALPHA',
    plant_name: 'Alpha Chemical Works',
    location: 'Patancheru, Hyderabad',
    runaway_temp: 150,
    runaway_pressure: 9.0,
    normal_temp_range: [110, 140],
    normal_pressure_range: [3.5, 6.0],
  },
  'R-102': {
    tag: 'R-102',
    name: 'Nitration Train 2',
    process: 'Aromatic Nitration',
    plant: 'PLANT_ALPHA',
    plant_name: 'Alpha Chemical Works',
    location: 'Patancheru, Hyderabad',
    runaway_temp: 150,
    runaway_pressure: 9.0,
    normal_temp_range: [110, 140],
    normal_pressure_range: [3.5, 6.0],
  },
  'R-201': {
    tag: 'R-201',
    name: 'Hydrogenation Train 1',
    process: 'Catalytic Hydrogenation',
    plant: 'PLANT_BETA',
    plant_name: 'Beta Pharma Industries',
    location: 'Ambernath MIDC, Mumbai',
    runaway_temp: 120,
    runaway_pressure: 12.0,
    normal_temp_range: [80, 110],
    normal_pressure_range: [5.0, 9.0],
  },
  'R-202': {
    tag: 'R-202',
    name: 'Hydrogenation Train 2',
    process: 'Catalytic Hydrogenation',
    plant: 'PLANT_BETA',
    plant_name: 'Beta Pharma Industries',
    location: 'Ambernath MIDC, Mumbai',
    runaway_temp: 120,
    runaway_pressure: 12.0,
    normal_temp_range: [80, 110],
    normal_pressure_range: [5.0, 9.0],
  },
  'R-301': {
    tag: 'R-301',
    name: 'Polymerization Reactor',
    process: 'Free Radical Polymerization',
    plant: 'PLANT_GAMMA',
    plant_name: 'Gamma Refinery Ltd',
    location: 'Manali Estate, Chennai',
    runaway_temp: 180,
    runaway_pressure: 7.0,
    normal_temp_range: [120, 160],
    normal_pressure_range: [2.0, 5.0],
  },
};

export const RISK_THRESHOLDS = {
  WARNING: 30,
  CRITICAL: 70,
  TEMP_CRITICAL: 162,
  PRESSURE_CRITICAL: 8.0,
  GAS_TOXIC: 25,
  GAS_ABORT: 500,
  PH_LOW_DANGER: 3,
  PH_HIGH_DANGER: 11,
  PH_LOW_WARNING: 4,
  PH_HIGH_WARNING: 10,
  CO2_WARNING: 2000,
  CO2_CRITICAL: 4000,
};

export const getReactorConfig = (id) =>
  REACTOR_CONFIG[id] || {
    tag: id,
    name: `Reactor ${id}`,
    process: 'Unknown',
    plant_name: 'Unknown Plant',
    location: '',
    runaway_temp: 200,
    runaway_pressure: 10,
  };

// IEC 61511 SIL banding — mirrored from backend/utils/silBands.js so the
// safety banding is always visible client-side. NORMAL (0–30) renders a
// default "SIL-0 · Normal Operations" badge rather than hiding it.
export const SIL_BANDS = [
  { max: 30, sil: 'SIL-0', label: 'Normal Operations', color: '#22c55e' },
  { max: 50, sil: 'SIL-0', label: 'Increased Monitoring', color: '#eab308' },
  { max: 70, sil: 'SIL-1', label: 'Warning', color: '#eab308' },
  { max: 85, sil: 'SIL-2', label: 'High Risk', color: '#f97316' },
  { max: 100, sil: 'SIL-3', label: 'Critical', color: '#ef4444' },
];

export const getSilBand = (score) =>
  SIL_BANDS.find((b) => score < b.max) || SIL_BANDS[SIL_BANDS.length - 1];
