import 'dotenv/config';

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

// Human-readable list of fatal configuration problems. Callers decide how
// to surface them (the server refuses to boot; the serverless handler
// answers 500 with the list) — throwing here at import time would only
// produce an opaque platform crash page.
export function missingProductionConfig() {
  if (!isProduction) return [];
  const problems = [];
  if (!process.env.JWT_SECRET) {
    problems.push(
      "JWT_SECRET is not set — add it in the host's environment variables (generate one with: openssl rand -hex 32)"
    );
  }
  if (!process.env.DATABASE_URL) {
    problems.push(
      'DATABASE_URL is not set — connect a Postgres database to this deployment'
    );
  }
  return problems;
}

export default {
  NODE_ENV,
  isProduction,
  PORT: Number(process.env.PORT) || 8000,
  DATABASE_URL:
    process.env.DATABASE_URL || 'postgresql://postgres@localhost/newsful',
  TEST_DATABASE_URL:
    process.env.TEST_DATABASE_URL ||
    'postgresql://postgres@localhost/newsful-test',
  // Managed Postgres (e.g. Neon) requires SSL; local Postgres doesn't.
  DATABASE_SSL: process.env.DATABASE_SSL
    ? process.env.DATABASE_SSL === 'true'
    : isProduction,
  JWT_SECRET: process.env.JWT_SECRET || 'dev-only-secret',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '7d',
};
