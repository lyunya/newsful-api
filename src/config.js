import 'dotenv/config';

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

if (isProduction && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in production');
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
  // Managed Postgres (e.g. Render) requires SSL; local Postgres doesn't.
  DATABASE_SSL: process.env.DATABASE_SSL
    ? process.env.DATABASE_SSL === 'true'
    : isProduction,
  JWT_SECRET: process.env.JWT_SECRET || 'dev-only-secret',
  JWT_EXPIRY: process.env.JWT_EXPIRY || '7d',
};
