import express from 'express';
import ArticlesService from './articles-service.js';
import { requireAuth } from '../middleware/jwt-auth.js';

const articlesRouter = express.Router();

const MAX_TITLE_LENGTH = 500;
const MAX_URL_LENGTH = 2048;
const MAX_SOURCE_LENGTH = 200;

function isHttpUrl(value) {
  if (typeof value !== 'string' || value.length > MAX_URL_LENGTH) return false;
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

// Every route is scoped to the authenticated user; nobody can read or
// touch anyone else's bookmarks.
articlesRouter.use(requireAuth);

articlesRouter
  .route('/')
  .get(async (req, res) => {
    const articles = await ArticlesService.getUserArticles(
      req.app.get('db'),
      req.user.id
    );
    res.json(articles);
  })
  .post(async (req, res) => {
    const { title, url, image, source } = req.body ?? {};

    for (const [field, value] of Object.entries({ title, url })) {
      if (!value) {
        return res
          .status(400)
          .json({ error: `Missing '${field}' in request body` });
      }
    }

    if (typeof title !== 'string' || title.length > MAX_TITLE_LENGTH) {
      return res.status(400).json({ error: "Invalid 'title'" });
    }
    // Links are rendered as hrefs, so only web URLs are accepted.
    if (!isHttpUrl(url)) {
      return res.status(400).json({ error: "Invalid 'url'" });
    }
    if (image && !isHttpUrl(image)) {
      return res.status(400).json({ error: "Invalid 'image'" });
    }
    if (source && (typeof source !== 'string' || source.length > MAX_SOURCE_LENGTH)) {
      return res.status(400).json({ error: "Invalid 'source'" });
    }

    const article = await ArticlesService.insertArticle(req.app.get('db'), {
      title,
      url,
      image: image || null,
      source: source || null,
      user_id: req.user.id,
    });
    res.status(201).json(article);
  });

articlesRouter.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(404).json({ error: "Article doesn't exist" });
  }

  const deleted = await ArticlesService.deleteUserArticle(
    req.app.get('db'),
    req.user.id,
    id
  );
  if (deleted === 0) {
    return res.status(404).json({ error: "Article doesn't exist" });
  }
  res.status(204).end();
});

export default articlesRouter;
