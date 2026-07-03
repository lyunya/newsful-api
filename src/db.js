import knex from 'knex';
import config from './config.js';

export function createDb(connectionString = config.DATABASE_URL) {
  return knex({
    client: 'pg',
    connection: {
      connectionString,
      ssl: config.DATABASE_SSL ? { rejectUnauthorized: false } : false,
    },
  });
}
