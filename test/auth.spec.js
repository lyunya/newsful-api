import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import { makeApp } from '../src/app.js';
import AuthService from '../src/auth/auth-service.js';
import { makeTestDb, cleanTables, seedUsers, testUsers } from './helpers.js';

const db = makeTestDb();
const app = makeApp(db);

beforeEach(() => cleanTables(db));
after(() => db.destroy());

test('POST /api/auth/login returns an expiring token and the user', async () => {
  const [user] = await seedUsers(db);
  const res = await supertest(app)
    .post('/api/auth/login')
    .send(testUsers[0])
    .expect(200);

  assert.deepEqual(res.body.user, { id: user.id, email: user.email });
  assert.equal(res.body.userId, user.id);

  const payload = AuthService.verifyJwt(res.body.authToken);
  assert.equal(payload.id, user.id);
  assert.equal(payload.sub, user.email);
  assert.ok(payload.exp, 'token must expire');
});

test('POST /api/auth/login rejects a wrong password with 401', async () => {
  await seedUsers(db);
  const res = await supertest(app)
    .post('/api/auth/login')
    .send({ email: testUsers[0].email, password: 'WrongP@ss1' })
    .expect(401);
  assert.equal(res.body.error, 'Incorrect email or password');
});

test('POST /api/auth/login rejects an unknown email with 401', async () => {
  const res = await supertest(app)
    .post('/api/auth/login')
    .send({ email: 'ghost@test.com', password: 'P@ssword1' })
    .expect(401);
  assert.equal(res.body.error, 'Incorrect email or password');
});

test('POST /api/auth/login requires both fields', async () => {
  const res = await supertest(app)
    .post('/api/auth/login')
    .send({ email: testUsers[0].email })
    .expect(400);
  assert.equal(res.body.error, "Missing 'password' in request body");
});
