-- 2026 modernization: timestamps, unique emails, and bookmark dedupe.

ALTER TABLE newsful_users
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Remove duplicate accounts before enforcing unique emails.
-- Keeps the oldest account; its duplicates' bookmarks cascade away.
DELETE FROM newsful_users a
    USING newsful_users b
    WHERE a.id > b.id AND lower(a.email) = lower(b.email);

CREATE UNIQUE INDEX IF NOT EXISTS newsful_users_email_uniq
    ON newsful_users (lower(email));

ALTER TABLE newsful_saved_articles
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Remove duplicate bookmarks before enforcing one bookmark per URL per user.
DELETE FROM newsful_saved_articles a
    USING newsful_saved_articles b
    WHERE a.id > b.id AND a.user_id = b.user_id AND a.url = b.url;

CREATE UNIQUE INDEX IF NOT EXISTS newsful_saved_articles_user_url_uniq
    ON newsful_saved_articles (user_id, url);

CREATE INDEX IF NOT EXISTS newsful_saved_articles_user_idx
    ON newsful_saved_articles (user_id);
