const express = require("express");
const ArticlesService = require("./articles-service");
const articlesRouter = express.Router();
const bodyParser = express.json();
const { requireAuth } = require("../middleware/jwt-auth");

articlesRouter
  .route("/")
  .get((req, res, next) => {
    const knexInstance = req.app.get("db");
    ArticlesService.getAllArticles(knexInstance)
      .then((articles) => {
        res.json(articles);
      })
      .catch(next);
  })
  .post(requireAuth, bodyParser, (req, res, next) => {
    const { title, url, image, user_id } = req.body;
    const newArticle = { title, url, image, user_id };
    for (const [key, value] of Object.entries(newArticle)) {
      if (value == null) {
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` },
        });
      }
    }
    ArticlesService.insertArticle(req.app.get("db"), newArticle)
      .then((article) => {
        res
          .status(201)
          .json(article);
      })
      .catch(next);
  })
  .delete((req, res, next) => {
    ArticlesService.deleteArticle(req.app.get("db"), req.body.id)
      .then((affected) => {
        res.status(204).end();
      })
      .catch(next);
  });
  articlesRouter
    .route("/:id")
    .all((req, res, next) => {
      ArticlesService.getById(req.app.get("db"), req.params.id)
        .then((article) => {
          if (!article) {
            return res.status(404).json({
              error: { message: `article doesn't exist` },
            });
          }
          res.id = article;
          next();
        })
        .catch(next);
    })
    .get((req, res, next) => {
      res.json(res.id);
    })
    .delete((req, res, next) => {
      console.log(req, "this is the req");
      ArticlesService.deleteArticle(req.app.get("db"), req.params.id)
        .then((affected) => {
          res.status(204).end();
        })
        .catch(next);
    });

module.exports = articlesRouter;
