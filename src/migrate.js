// Applies SQL migrations from ../migrations. Used by scripts/migrate.js
// (CLI / traditional servers) and api/index.js (serverless cold start).
import path from 'node:path';
import pg from 'pg';
import Postgrator from 'postgrator';
import config from './config.js';

export async function runMigrations({
  connectionString = config.DATABASE_URL,
  targetVersion = 'max',
} = {}) {
  const client = new pg.Client({
    connectionString,
    ssl: config.DATABASE_SSL ? { rejectUnauthorized: false } : false,
  });

  await client.connect();
  try {
    const postgrator = new Postgrator({
      migrationPattern: path.join(import.meta.dirname, '../migrations/*'),
      driver: 'pg',
      database: new URL(connectionString).pathname.slice(1),
      execQuery: (query) => client.query(query),
      // Databases migrated by the old postgrator-cli may have recorded
      // different checksums; migrations are idempotent, so skip validation.
      validateChecksums: false,
    });
    return await postgrator.migrate(targetVersion);
  } finally {
    await client.end();
  }
}
