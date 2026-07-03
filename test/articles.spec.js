import { test, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import supertest from 'supertest';
import { makeApp } from '../src/app.js';
import {
  makeTestDb,
  cleanTables,
  seedUsers,
  seedArticles,
  authHeader,
} from './helpers.js';

const db = makeTestDb();
const app = makeApp(db);

beforeEach(() => cleanTables(db));
after(() => db.destroy());

test('saved-articles routes all require authentication', async () => {
  await supertest(app).get('/api/saved-articles').expect(401);
  await supertest(app)
    .post('/api/saved-articles')
    .send({ title: 't', url: 'https://x.com' })
    .expect(401);
  await supertest(app).delete('/api/saved-articles/1').expect(401);
});

test("GET /api/saved-articles returns only the requester's articles", async () => {
  const users = await seedUsers(db);
  await seedArticles(db, users);

  const res = await supertest(app)
    .get('/api/saved-articles')
    .set('Authorization', authHeader(users[0]))
    .expect(200);

  assert.equal(res.body.length, 1);
  assert.equal(res.body[0].title, 'First user story');
  assert.equal(res.body[0].user_id, users[0].id);
});

test('POST /api/saved-articles takes the owner from the token, not the body', async () => {
  const users = await seedUsers(db);

  const res = await supertest(app)
    .post('/api/saved-articles')
    .set('Authorization', authHeader(users[0]))
    .send({
      title: 'A story',
      url: 'https://www.bbc.com/a-story',
      user_id: users[1].id,
    })
    .expect(201);

  assert.equal(res.body.user_id, users[0].id);
});

test('POST /api/saved-articles is idempotent per URL', async () => {
  const users = await seedUsers(db);
  const article = { title: 'A story', url: 'https://www.bbc.com/a-story' };

  const first = await supertest(app)
    .post('/api/saved-articles')
    .set('Authorization', authHeader(users[0]))
    .send(article)
    .expect(201);
  const second = await supertest(app)
    .post('/api/saved-articles')
    .set('Authorization', authHeader(users[0]))
    .send(article)
    .expect(201);

  assert.equal(second.body.id, first.body.id);
  const count = await db('newsful_saved_articles').count('* as n').first();
  assert.equal(Number(count.n), 1);
});

test('POST /api/saved-articles validates required fields', async () => {
  const [user] = await seedUsers(db);
  const res = await supertest(app)
    .post('/api/saved-articles')
    .set('Authorization', authHeader(user))
    .send({ title: 'No url' })
    .expect(400);
  assert.equal(res.body.error, "Missing 'url' in request body");
});

test("DELETE /api/saved-articles/:id deletes own article, 404s on someone else's", async () => {
  const users = await seedUsers(db);
  const [mine, theirs] = await seedArticles(db, users);

  await supertest(app)
    .delete(`/api/saved-articles/${theirs.id}`)
    .set('Authorization', authHeader(users[0]))
    .expect(404);

  await supertest(app)
    .delete(`/api/saved-articles/${mine.id}`)
    .set('Authorization', authHeader(users[0]))
    .expect(204);

  const remaining = await db('newsful_saved_articles').select('*');
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, theirs.id);
});

test('rejects an expired token', async () => {
  const jwt = await import('jsonwebtoken');
  const config = (await import('../src/config.js')).default;
  const [user] = await seedUsers(db);
  const expired = jwt.default.sign({ id: user.id }, config.JWT_SECRET, {
    subject: user.email,
    expiresIn: '-1s',
  });

  await supertest(app)
    .get('/api/saved-articles')
    .set('Authorization', `Bearer ${expired}`)
    .expect(401);
});
