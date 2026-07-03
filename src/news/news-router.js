import express from 'express';
import { getNews } from './news-service.js';

const newsRouter = express.Router();

newsRouter.get('/', async (req, res) => {
  const query = String(req.query.q ?? '')
    .trim()
    .slice(0, 100);

  try {
    res.json(await getNews(query));
  } catch (error) {
    console.error('News feeds unavailable:', error.message);
    res.status(502).json({ error: 'News feeds are unavailable right now' });
  }
});

export default newsRouter;
