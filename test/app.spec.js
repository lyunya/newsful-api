import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import { makeApp } from '../src/app.js';
import { makeTestDb } from './helpers.js';

const db = makeTestDb();
const app = makeApp(db);

after(() => db.destroy());

test('GET / responds with a health check', async () => {
  const res = await supertest(app).get('/').expect(200);
  assert.equal(res.body.status, 'ok');
});

test('unknown routes respond 404 with JSON', async () => {
  const res = await supertest(app).get('/nope').expect(404);
  assert.equal(res.body.error, 'Not found');
});

test('GET /api/users no longer exists (used to leak password hashes)', async () => {
  await supertest(app).get('/api/users').expect(404);
});
