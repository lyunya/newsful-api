// Runs SQL migrations from ./migrations against DATABASE_URL
// (or TEST_DATABASE_URL with --test). Usage:
//   npm run migrate            migrate to latest
//   npm run migrate -- 001     migrate up/down to version 001
import path from 'node:path';
import pg from 'pg';
import Postgrator from 'postgrator';
import config from '../src/config.js';

const args = process.argv.slice(2);
const useTestDb = args.includes('--test');
const targetVersion = args.find((arg) => !arg.startsWith('--')) || 'max';

const connectionString = useTestDb
  ? config.TEST_DATABASE_URL
  : config.DATABASE_URL;

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
  });

  const applied = await postgrator.migrate(targetVersion);
  if (applied.length === 0) {
    console.log('Already up to date');
  } else {
    for (const migration of applied) {
      console.log(`Applied ${migration.filename}`);
    }
  }
} finally {
  await client.end();
}
