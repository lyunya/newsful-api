const TABLE = 'newsful_saved_articles';
const COLUMNS = ['id', 'title', 'url', 'image', 'user_id', 'created_at'];

const ArticlesService = {
  getUserArticles(db, userId) {
    return db(TABLE)
      .select(COLUMNS)
      .where({ user_id: userId })
      .orderBy('created_at', 'desc');
  },
  getUserArticleByUrl(db, userId, url) {
    return db(TABLE).select(COLUMNS).where({ user_id: userId, url }).first();
  },
  async insertArticle(db, article) {
    // Saving the same URL twice is a no-op thanks to the unique
    // (user_id, url) index; return the existing row instead of erroring.
    const [inserted] = await db(TABLE)
      .insert(article)
      .onConflict(['user_id', 'url'])
      .ignore()
      .returning(COLUMNS);
    return (
      inserted ??
      ArticlesService.getUserArticleByUrl(db, article.user_id, article.url)
    );
  },
  // Returns the number of rows deleted; 0 means the article either
  // doesn't exist or belongs to someone else.
  deleteUserArticle(db, userId, id) {
    return db(TABLE).where({ id, user_id: userId }).delete();
  },
};

export default ArticlesService;
