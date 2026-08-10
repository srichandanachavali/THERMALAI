// Fail-fast environment validation at startup. A misconfigured deployment must
// not boot into a half-working state where, e.g., JWT signing silently uses a
// weak secret. Missing critical vars or a short JWT_SECRET aborts the process.

const REQUIRED = ['MONGO_URI', 'JWT_SECRET', 'ML_URL'];
const MIN_JWT_SECRET_LENGTH = 32;

// Tests use a short throwaway secret; never let the hard fail fire there.
const isTest = (env) => env.NODE_ENV === 'test';

function validateEnv(env = process.env) {
  const missing = REQUIRED.filter((key) => !env[key]);
  if (missing.length) {
    // eslint-disable-next-line no-console
    console.error(
      `[validateEnv] Missing required environment variable(s): ${missing.join(', ')}`
    );
    if (!isTest(env)) process.exit(1);
  }

  if (String(env.JWT_SECRET).length < MIN_JWT_SECRET_LENGTH) {
    // eslint-disable-next-line no-console
    console.error(
      `[validateEnv] JWT_SECRET must be at least ${MIN_JWT_SECRET_LENGTH} characters (got ${env.JWT_SECRET.length}). ` +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""
    );
    if (!isTest(env)) process.exit(1);
  }

  return true;
}

module.exports = { validateEnv, REQUIRED, MIN_JWT_SECRET_LENGTH };
