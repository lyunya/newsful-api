// Fetches news from Google News RSS — free, keyless, and per-outlet, so it
// can't die the way a metered API key can. Results are cached in memory and
// stale data is served if the feeds are unreachable.
import { XMLParser } from 'fast-xml-parser';

export const LANES = [
  { id: 'liberal', label: 'Liberal', domains: ['msnbc.com', 'huffpost.com'] },
  {
    id: 'conservative',
    label: 'Conservative',
    domains: ['foxnews.com', 'breitbart.com'],
  },
  { id: 'neutral', label: 'Neutral', domains: ['bbc.com', 'npr.org'] },
];

const TOP_STORIES_TTL_MS = 10 * 60 * 1000;
const SEARCH_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 200;
const ARTICLES_PER_LANE = 20;
const FEED_TIMEOUT_MS = 10_000;

const parser = new XMLParser({ ignoreAttributes: false });
const cache = new Map();

export function clearNewsCache() {
  cache.clear();
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  return value == null ? [] : [value];
}

function feedUrl(domain, query) {
  // "when:2d" keeps the keyword-less feed to recent stories.
  const q = query ? `${query} site:${domain}` : `site:${domain} when:2d`;
  const params = new URLSearchParams({ q, hl: 'en-US', gl: 'US', ceid: 'US:en' });
  return `https://news.google.com/rss/search?${params}`;
}

export function parseFeed(xml, laneId) {
  const items = toArray(parser.parse(xml)?.rss?.channel?.item);
  return items
    .map((item) => {
      const source =
        typeof item.source === 'object' ? item.source['#text'] : item.source;
      let title = String(item.title ?? '');
      // Google News appends " - Source Name" to every headline
      if (source && title.endsWith(` - ${source}`)) {
        title = title.slice(0, -(source.length + 3));
      }
      const published = item.pubDate ? new Date(item.pubDate) : null;
      return {
        title,
        url: typeof item.link === 'string' ? item.link : null,
        image: null,
        source: source || null,
        published:
          published && !Number.isNaN(published.getTime())
            ? published.toISOString()
            : null,
        lane: laneId,
      };
    })
    .filter((article) => article.title && article.url);
}

async function fetchLane(lane, query, fetchImpl) {
  const perDomain = await Promise.allSettled(
    lane.domains.map(async (domain) => {
      const response = await fetchImpl(feedUrl(domain, query), {
        headers: { 'user-agent': 'newsful/2 (+https://newsful.vercel.app)' },
        signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
      });
      if (!response.ok) {
        throw new Error(`Feed for ${domain} failed (${response.status})`);
      }
      return parseFeed(await response.text(), lane.id);
    })
  );

  const seen = new Set();
  return perDomain
    .flatMap((result) => (result.status === 'fulfilled' ? result.value : []))
    .filter((article) => {
      if (seen.has(article.url)) return false;
      seen.add(article.url);
      return true;
    })
    .sort((a, b) => (b.published ?? '').localeCompare(a.published ?? ''))
    .slice(0, ARTICLES_PER_LANE);
}

// Returns { liberal: [...], conservative: [...], neutral: [...] }.
export async function getNews(query = '', { fetchImpl = fetch } = {}) {
  const cacheKey = query.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  try {
    const lanes = await Promise.all(
      LANES.map((lane) => fetchLane(lane, query, fetchImpl))
    );
    const data = Object.fromEntries(LANES.map((lane, i) => [lane.id, lanes[i]]));

    if (Object.values(data).every((articles) => articles.length === 0)) {
      throw new Error('All news feeds came back empty');
    }

    if (cache.size >= MAX_CACHE_ENTRIES) {
      cache.delete(cache.keys().next().value);
    }
    cache.set(cacheKey, {
      data,
      expires: Date.now() + (query ? SEARCH_TTL_MS : TOP_STORIES_TTL_MS),
    });
    return data;
  } catch (error) {
    // Serve expired data rather than nothing when the feeds are flaky.
    if (cached) return cached.data;
    throw error;
  }
}
