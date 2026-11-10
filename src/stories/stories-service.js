// Fetches a wide pool of recent headlines and groups the ones that report the
// same story (see story-matcher.js). Cached in memory; stale results are
// served if the feeds are unreachable.
import { parseFeed, FEED_HEADERS } from "../news/news-service.js";
import { STORY_SOURCES } from "./story-sources.js";
import { matchStories } from "./story-matcher.js";

const TTL_MS = 10 * 60 * 1000;
const FEED_TIMEOUT_MS = 8_000;
const MAX_AGE_MS = 48 * 60 * 60 * 1000;
const MAX_PER_FEED = 60;

let cached = null;

export function clearStoriesCache() {
  cached = null;
}

export async function fetchStoryPool(fetchImpl = fetch, now = Date.now()) {
  const perFeed = await Promise.allSettled(
    STORY_SOURCES.map(async ({ lane, source, url }) => {
      const response = await fetchImpl(url, {
        headers: FEED_HEADERS,
        signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
      });
      if (!response.ok) {
        throw new Error(`Feed for ${source} failed (${response.status})`);
      }
      return parseFeed(await response.text(), lane, { includeSummary: true })
        .slice(0, MAX_PER_FEED)
        .map((article) => ({ ...article, source }));
    }),
  );

  const seen = new Set();
  return perFeed
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .filter((article) => {
      if (seen.has(article.url)) return false;
      seen.add(article.url);
      if (!article.published) return true;
      return now - Date.parse(article.published) <= MAX_AGE_MS;
    });
}

// Returns { stories: [...], outlets: n, headlines: n }.
export async function getStories({ fetchImpl = fetch } = {}) {
  if (cached && cached.expires > Date.now()) return cached.data;

  try {
    const pool = await fetchStoryPool(fetchImpl);
    if (pool.length === 0) throw new Error("All story feeds came back empty");

    const data = {
      stories: matchStories(pool),
      outlets: new Set(pool.map((article) => article.source)).size,
      headlines: pool.length,
    };
    cached = { data, expires: Date.now() + TTL_MS };
    return data;
  } catch (error) {
    if (cached) return cached.data;
    throw error;
  }
}
