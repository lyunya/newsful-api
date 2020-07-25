const ArticlesService = {
  getAllArticles(db) {
    return db.select("*").from("newsful_saved_articles");
  },

  insertArticle(db, newArticle) {
    return db
      .insert(newArticle)
      .into("newsful_saved_articles")
      .returning("*")
      .then((rows) => {
        return rows[0];
      });
  },
  getById(db, id) {
    return db
      .from("newsful_saved_articles")
      .select("*")
      .where("id", id)
      .first();
  },
  deleteArticle(db, id) {
    return db("newsful_saved_articles").where({ id }).delete();
  },
};

module.exports = ArticlesService;
