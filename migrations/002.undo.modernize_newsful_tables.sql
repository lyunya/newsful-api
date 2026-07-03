DROP INDEX IF EXISTS newsful_saved_articles_user_idx;
DROP INDEX IF EXISTS newsful_saved_articles_user_url_uniq;
DROP INDEX IF EXISTS newsful_users_email_uniq;
ALTER TABLE newsful_saved_articles DROP COLUMN IF EXISTS created_at;
ALTER TABLE newsful_users DROP COLUMN IF EXISTS created_at;
