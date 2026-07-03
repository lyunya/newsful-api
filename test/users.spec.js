import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import bcrypt from 'bcryptjs';
import { makeApp } from '../src/app.js';
import AuthService from '../src/auth/auth-service.js';
import { makeTestDb, cleanTables, seedUsers } from './helpers.js';

const db = makeTestDb();
const app = makeApp(db);

beforeEach(() => cleanTables(db));
after(() => db.destroy());

test('POST /api/users creates a user and logs them in', async () => {
  const res = await supertest(app)
    .post('/api/users')
    .send({ email: 'new@test.com', password: 'P@ssword1' })
    .expect(201);

  assert.equal(res.body.user.email, 'new@test.com');
  assert.ok(!('password' in res.body.user), 'response must not echo password');

  const payload = AuthService.verifyJwt(res.body.authToken);
  assert.equal(payload.id, res.body.user.id);
  assert.ok(payload.exp, 'token must expire');

  const stored = await db('newsful_users')
    .where({ email: 'new@test.com' })
    .first();
  assert.ok(await bcrypt.compare('P@ssword1', stored.password));
});

test('POST /api/users rejects duplicate emails with 409, case-insensitively', async () => {
  await seedUsers(db);
  const res = await supertest(app)
    .post('/api/users')
    .send({ email: 'FIRST@test.com', password: 'P@ssword1' })
    .expect(409);
  assert.equal(res.body.error, 'Email already taken');
});

test('POST /api/users validates the password', async () => {
  const weakPasswords = [
    ['short', 'Sh0rt!'],
    ['no special char', 'Password11'],
    ['no upper case', 'p@ssword1'],
  ];
  for (const [, password] of weakPasswords) {
    const res = await supertest(app)
      .post('/api/users')
      .send({ email: 'new@test.com', password })
      .expect(400);
    assert.match(res.body.error, /password/i);
  }
});

test('POST /api/users validates the email', async () => {
  const res = await supertest(app)
    .post('/api/users')
    .send({ email: 'not-an-email', password: 'P@ssword1' })
    .expect(400);
  assert.equal(res.body.error, 'Invalid email address');
});

test('POST /api/users requires both fields', async () => {
  const res = await supertest(app)
    .post('/api/users')
    .send({ email: 'new@test.com' })
    .expect(400);
  assert.equal(res.body.error, "Missing 'password' in request body");
});
