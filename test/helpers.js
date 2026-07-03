import bcrypt from 'bcryptjs';
import { createDb } from '../src/db.js';
import config from '../src/config.js';
import AuthService from '../src/auth/auth-service.js';

export function makeTestDb() {
  return createDb(config.TEST_DATABASE_URL);
}

export function cleanTables(db) {
  return db.raw(
    'TRUNCATE newsful_saved_articles, newsful_users RESTART IDENTITY CASCADE'
  );
}

export const testUsers = [
  { email: 'first@test.com', password: 'P@ssword1' },
  { email: 'second@test.com', password: 'P@ssword2' },
];

export async function seedUsers(db) {
  const rows = await Promise.all(
    testUsers.map(async (user) => ({
      email: user.email,
      password: await bcrypt.hash(user.password, 4),
    }))
  );
  return db('newsful_users').insert(rows).returning(['id', 'email']);
}

export function seedArticles(db, users) {
  return db('newsful_saved_articles')
    .insert([
      {
        title: 'First user story',
        url: 'https://www.npr.org/first-user-story',
        image: null,
        user_id: users[0].id,
      },
      {
        title: 'Second user story',
        url: 'https://www.bbc.com/second-user-story',
        image: 'https://example.com/image.jpg',
        user_id: users[1].id,
      },
    ])
    .returning('*');
}

export function authHeader(user) {
  return `Bearer ${AuthService.createJwt(user)}`;
}
