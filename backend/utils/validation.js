// Shared input-validation + error-sanitization helpers.
// Centralizes the audit's 1C (numeric bounds), 1D (MongoDB injection guard),
// and 1J (no stack traces in production) rules so every controller uses one
// code path instead of ad-hoc checks.

// Strip any character that is not a safe ID character. Applying this to every
// route param / body id before it reaches a Mongoose filter defeats NoSQL
// injection (object/operator payloads like {$ne: ...}) at the boundary.
function sanitize(value) {
  return String(value == null ? '' : value).replace(/[^a-zA-Z0-9_-]/g, '');
}

// Production-safe error message: never leak internals or stack traces to a
// client. In dev/test the real message is returned for debuggability.
function safeError(error) {
  if (process.env.NODE_ENV === 'production') {
    return 'Internal server error';
  }
  return error && error.message ? error.message : String(error);
}

const isNumberInRange = (v, min, max) =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

// Validate a reactor stream reading against IEC 61511 sensor envelopes.
// Returns { ok: true } or { ok: false, errors: [..] }.
function validateReading(body = {}) {
  const errors = [];

  if (!body.reactor_id || !sanitize(body.reactor_id)) {
    errors.push('reactor_id is required');
  }

  const checks = [
    ['temperature', body.temperature, -50, 500, 'temperature'],
    ['pressure', body.pressure, 0, 50, 'pressure'],
    ['reaction_rate', body.reaction_rate, 0, 1, 'reaction_rate'],
    ['cooling_efficiency', body.cooling_efficiency, 0, 1, 'cooling_efficiency'],
  ];
  checks.forEach(([field, value, min, max, label]) => {
    if (!isNumberInRange(value, min, max)) {
      errors.push(`${label} must be a number between ${min} and ${max}`);
    }
  });

  // Optional IEC 61511 secondary sensors (still bounds-checked when present).
  if (body.flow_rate != null && !isNumberInRange(body.flow_rate, 0, Infinity)) {
    errors.push('flow_rate must be a non-negative number');
  }
  if (body.material_level != null && !isNumberInRange(body.material_level, 0, 100)) {
    errors.push('material_level must be between 0 and 100');
  }
  if (body.gas_concentration != null && !isNumberInRange(body.gas_concentration, 0, Infinity)) {
    errors.push('gas_concentration must be a non-negative number');
  }
  if (body.ph_level != null && !isNumberInRange(body.ph_level, 0, 14)) {
    errors.push('ph_level must be between 0 and 14');
  }
  if (body.emissions_co2_ppm != null && !isNumberInRange(body.emissions_co2_ppm, 0, Infinity)) {
    errors.push('emissions_co2_ppm must be a non-negative number');
  }
  if (body.temp_rate_of_change != null && typeof body.temp_rate_of_change !== 'number') {
    errors.push('temp_rate_of_change must be a number');
  }

  return errors.length ? { ok: false, errors } : { ok: true };
}

module.exports = { sanitize, safeError, validateReading, isNumberInRange };
