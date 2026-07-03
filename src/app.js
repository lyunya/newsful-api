import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import helmet from 'helmet';
import config from './config.js';
import usersRouter from './users/users-router.js';
import authRouter from './auth/auth-router.js';
import articlesRouter from './saved-articles/articles-router.js';
import newsRouter from './news/news-router.js';

// App factory so tests can inject their own database connection.
export function makeApp(db) {
  const app = express();
  app.set('db', db);

  if (config.NODE_ENV !== 'test') {
    app.use(morgan(config.isProduction ? 'tiny' : 'dev'));
  }
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.get('/', (req, res) => {
    res.json({ status: 'ok', name: 'newsful-api' });
  });

  app.use('/api/users', usersRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/saved-articles', articlesRouter);
  app.use('/api/news', newsRouter);

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((error, req, res, next) => {
    console.error(error);
    const response = config.isProduction
      ? { error: 'Server error' }
      : { error: error.message };
    res.status(500).json(response);
  });

  return app;
}
