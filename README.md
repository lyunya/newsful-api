# Newsful API

The API behind [Newsful](https://github.com/lyunya/Newsful-app). Newsful itself works without an account — this service exists for the optional part: accounts and syncing saved articles across devices.

## Stack

* Node.js 20+ (ES modules), Express 5
* Postgres via Knex, plain-SQL migrations run by Postgrator
* JWT authentication (tokens expire; `7d` by default)
* Tests with the built-in `node:test` runner + Supertest

## Getting started

```bash
npm install
cp .env.example .env    # fill in values
npm run migrate         # apply SQL migrations
psql "$DATABASE_URL" -f seeds/seed.tables.sql   # optional demo data
npm run dev             # start with auto-reload on http://localhost:8000
```

Run the tests (needs `TEST_DATABASE_URL` pointing at a migrated test database):

```bash
npm run migrate:test
npm test
```

## Deploying (Vercel + Neon)

The repo is set up to run as a single Vercel serverless function (`api/index.js` + `vercel.json`); pending migrations apply themselves on cold start.

1. In [Vercel](https://vercel.com/new), import this repository as a new project (no build settings needed).
2. In the project's **Storage** tab, create a **Neon** Postgres database (free tier) and connect it — this injects `DATABASE_URL` automatically.
3. In **Settings → Environment Variables**, add `JWT_SECRET` (e.g. `openssl rand -hex 32`) and redeploy.

It also still runs as a traditional server (`npm start`) on any Node host — migrations run before boot there too.

## Configuration

| Variable | Purpose | Default |
| --- | --- | --- |
| `PORT` | Listen port | `8000` |
| `DATABASE_URL` | Postgres connection string | local `newsful` db |
| `TEST_DATABASE_URL` | Postgres connection string for tests | local `newsful-test` db |
| `JWT_SECRET` | Token signing secret — **required in production** | dev-only fallback |
| `JWT_EXPIRY` | Token lifetime | `7d` |
| `DATABASE_SSL` | `true`/`false`, TLS to Postgres | `true` in production |

## API

All error responses look like `{ "error": "message" }`.

### `GET /api/news` — no auth required

Aggregated news for the app's three lanes, sourced from free Google News RSS feeds per outlet (no API key involved). Optional `?q=search+terms` for topic search.

Responds `200` with:

```json
{ "liberal": [ { "title": "…", "url": "…", "source": "MSNBC", "published": "…", "lane": "liberal", "image": null } ], "conservative": [], "neutral": [] }
```

Results are cached in memory (10 min for top stories, 5 min for searches) and stale results are served if the upstream feeds are unreachable; a cold failure responds `502`.

### `POST /api/users` — register

Body: `{ "email": string, "password": string }`
Password rules: 8–72 chars, with upper case, lower case, number, and special character.

Responds `201` with the new user **already logged in**:

```json
{ "authToken": "…", "user": { "id": 1, "email": "you@example.com" } }
```

Errors: `400` invalid email/password, `409` email already taken.

### `POST /api/auth/login`

Body: `{ "email": string, "password": string }`

Responds `200` with `{ "authToken": "…", "user": { "id": 1, "email": "…" } }`.
Errors: `400` missing fields, `401` wrong credentials.

Login and registration are rate limited (30 attempts / 15 min per IP).

### Saved articles — all require `Authorization: Bearer <token>`

* `GET /api/saved-articles` — the authenticated user's saved articles, newest first
* `POST /api/saved-articles` — body `{ "title": string, "url": string, "image": string? }`; the owner is taken from the token. Saving the same URL twice is idempotent. Responds `201` with the article.
* `DELETE /api/saved-articles/:id` — responds `204`; `404` if the article doesn't exist **or belongs to someone else**

## Notable changes in the 2026 rewrite

* **Removed `GET /api/users`** — it returned every user's email and bcrypt hash to anyone
* **Saved articles are scoped server-side** — the old API returned all users' bookmarks unauthenticated and trusted `user_id` from the request body; now everything derives from the JWT
* **Deletes check ownership** — previously any (even unauthenticated) request could delete any bookmark by id
* **JWTs expire** and `JWT_SECRET` must be set in production
* **Schema hardening (migration 002)** — unique emails (case-insensitive), one bookmark per URL per user, `created_at` timestamps, index on `user_id`
