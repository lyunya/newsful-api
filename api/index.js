// Vercel serverless entry point. Every route is handled by the same
// Express app used everywhere else; vercel.json rewrites all paths here.
import { createDb } from '../src/db.js';
import { makeApp } from '../src/app.js';
import { runMigrations } from '../src/migrate.js';

const db = createDb();
const app = makeApp(db);

// Migrate once per cold start (a fast no-op when already up to date).
let ready;

export default async function handler(req, res) {
  ready ??= runMigrations().catch((error) => {
    ready = undefined; // let the next request retry
    throw error;
  });
  await ready;
  return app(req, res);
}
