// Runs SQL migrations from ./migrations against DATABASE_URL
// (or TEST_DATABASE_URL with --test). Usage:
//   npm run migrate            migrate to latest
//   npm run migrate -- 001     migrate up/down to version 001
import config from '../src/config.js';
import { runMigrations } from '../src/migrate.js';

const args = process.argv.slice(2);
const useTestDb = args.includes('--test');
const targetVersion = args.find((arg) => !arg.startsWith('--')) || 'max';

const applied = await runMigrations({
  connectionString: useTestDb ? config.TEST_DATABASE_URL : config.DATABASE_URL,
  targetVersion,
});

if (applied.length === 0) {
  console.log('Already up to date');
} else {
  for (const migration of applied) {
    console.log(`Applied ${migration.filename}`);
  }
}
