import express from 'express';
import ArticlesService from './articles-service.js';
import { requireAuth } from '../middleware/jwt-auth.js';

const articlesRouter = express.Router();

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
