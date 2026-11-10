// Fetches news from Google News RSS — free, keyless, and per-outlet, so it
// can't die the way a metered API key can. Results are cached in memory and
// stale data is served if the feeds are unreachable.
import { XMLParser } from "fast-xml-parser";

export const LANES = [
  { id: "liberal", label: "Liberal", domains: ["ms.now", "huffpost.com"] },
  {
    id: "conservative",
    label: "Conservative",
    domains: ["foxnews.com", "breitbart.com"],
  },
  { id: "neutral", label: "Neutral", domains: ["bbc.com", "npr.org"] },
];

const PUBLISHER_FEEDS = {
  "huffpost.com": {
    source: "HuffPost",
    url: "https://www.huffpost.com/section/politics/feed",
  },
  "foxnews.com": {
    source: "Fox News",
    url: "https://moxie.foxnews.com/google-publisher/latest.xml",
  },
  "breitbart.com": {
    source: "Breitbart",
    url: "https://feeds.feedburner.com/breitbart",
  },
  "bbc.com": {
    source: "BBC",
    url: "https://feeds.bbci.co.uk/news/rss.xml",
  },
  "npr.org": {
    source: "NPR",
    url: "https://feeds.npr.org/1001/rss.xml",
  },
};

const TOP_STORIES_TTL_MS = 10 * 60 * 1000;
const SEARCH_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 200;
const ARTICLES_PER_LANE = 20;
const FEED_TIMEOUT_MS = 10_000;
const IMAGE_TIMEOUT_MS = 2_500;
const IMAGE_ARTICLES_PER_LANE = 12;

const parser = new XMLParser({ ignoreAttributes: false });

export const FEED_HEADERS = {
  "user-agent": "newsful/2 (+https://newsful.vercel.app)",
};
const cache = new Map();

export function clearNewsCache() {
  cache.clear();
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  return value == null ? [] : [value];
}

function feedUrl(domain, query) {
  if (!query && PUBLISHER_FEEDS[domain]) {
    return PUBLISHER_FEEDS[domain].url;
  }

  // "when:2d" keeps the keyword-less feed to recent stories.
  const q = query ? `${query} site:${domain}` : `site:${domain} when:2d`;
  const params = new URLSearchParams({
    q,
    hl: "en-US",
    gl: "US",
    ceid: "US:en",
  });
  return `https://news.google.com/rss/search?${params}`;
}

function decodeHtmlAttribute(value) {
  return String(value)
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

export function extractPageImage(html, pageUrl) {
  const metas = String(html).match(/<meta\b[^>]*>/gi) ?? [];

  for (const meta of metas) {
    const name = meta.match(/\b(?:property|name)=["']([^"']+)["']/i)?.[1];
    if (!["og:image", "twitter:image"].includes(name)) continue;

    const content = meta.match(/\bcontent=["']([^"']+)["']/i)?.[1];
    if (!content) continue;

    try {
      const imageUrl = new URL(decodeHtmlAttribute(content), pageUrl).href;
      if (isUsefulImageUrl(imageUrl)) return imageUrl;
    } catch {
      return null;
    }
  }

  return null;
}

function firstValue(...values) {
  return values.find((value) => typeof value === "string" && value);
}

function isUsefulImageUrl(url) {
  return (
    url &&
    !url.includes("tracking/npr-rss-pixel") &&
    !url.includes("/gnews/logo/") &&
    !/\/-DR60l-K8vnyi99NZovm9HlXyZwQ85GMDxiwJWzoasZYCUrPuUM_P_4Rb7ei03j-0nRs0c4F=/.test(
      url,
    )
  );
}

function imageUrlFromMedia(value) {
  const media = Array.isArray(value) ? value[0] : value;
  if (!media || typeof media !== "object") return null;
  const url = firstValue(media["@_url"], media.url);
  return isUsefulImageUrl(url) ? url : null;
}

function imageUrlFromHtml(value) {
  if (typeof value !== "string") return null;
  const src = value.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i)?.[1];
  if (!src || src === "undefined") return null;

  const url = decodeHtmlAttribute(src);
  return isUsefulImageUrl(url) ? url : null;
}

function itemImage(item) {
  return firstValue(
    imageUrlFromMedia(item["media:content"]),
    imageUrlFromMedia(item["media:thumbnail"]),
    imageUrlFromMedia(item.enclosure),
    imageUrlFromHtml(item["content:encoded"]),
    imageUrlFromHtml(item.description),
  );
}

// Google News links are redirect pages whose only preview image is the
// Google News logo, never the story's own picture.
function isGoogleNewsLink(url) {
  try {
    return new URL(url).hostname === "news.google.com";
  } catch {
    return false;
  }
}

async function fetchArticleImage(article, fetchImpl) {
  if (isGoogleNewsLink(article.url)) return null;

  try {
    const response = await fetchImpl(article.url, {
      headers: { "user-agent": "newsful/2 (+https://newsful.vercel.app)" },
      signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS),
    });
    if (!response.ok) return null;

    const contentType = response.headers?.get?.("content-type") ?? "";
    if (contentType && !contentType.includes("text/html")) return null;

    return extractPageImage(await response.text(), response.url || article.url);
  } catch {
    return null;
  }
}

async function enrichArticleImages(articles, fetchImpl) {
  const visibleArticles = articles.slice(0, IMAGE_ARTICLES_PER_LANE);
  const images = await Promise.all(
    visibleArticles.map((article) =>
      article.image
        ? Promise.resolve(null)
        : fetchArticleImage(article, fetchImpl),
    ),
  );

  return articles.map((article, index) => ({
    ...article,
    image: images[index] ?? article.image,
  }));
}

const NAMED_ENTITIES = {
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  nbsp: " ",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  ndash: "–",
  mdash: "—",
  hellip: "…",
};

// Some feeds double-encode, leaving "&#039;" or "&amp;" in headlines after
// the XML parser has done its pass.
export function decodeEntities(value) {
  return String(value).replace(
    /&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi,
    (match, decimal, hex, name) => {
      if (decimal) return String.fromCodePoint(Number(decimal));
      if (hex) return String.fromCodePoint(parseInt(hex, 16));
      return NAMED_ENTITIES[name.toLowerCase()] ?? match;
    },
  );
}

function plainText(html, maxLength) {
  if (typeof html !== "string") return "";
  return decodeEntities(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function parseFeed(xml, laneId, { includeSummary = false } = {}) {
  const items = toArray(parser.parse(xml)?.rss?.channel?.item);
  return items
    .map((item) => {
      const rawSource =
        typeof item.source === "object" ? item.source["#text"] : item.source;
      const source = rawSource ? decodeEntities(rawSource) : rawSource;
      let title = decodeEntities(String(item.title ?? "")).trim();
      // Google News appends " - Source Name" to every headline
      if (source && title.endsWith(` - ${source}`)) {
        title = title.slice(0, -(source.length + 3));
      }
      const published = item.pubDate ? new Date(item.pubDate) : null;
      return {
        title,
        url: typeof item.link === "string" ? item.link : null,
        image: itemImage(item),
        source: source || null,
        published:
          published && !Number.isNaN(published.getTime())
            ? published.toISOString()
            : null,
        lane: laneId,
        ...(includeSummary
          ? { summary: plainText(item.description, 300) }
          : {}),
      };
    })
    .filter((article) => article.title && article.url);
}

async function fetchLane(lane, query, fetchImpl, enrichImages) {
  const perDomain = await Promise.allSettled(
    lane.domains.map(async (domain) => {
      const response = await fetchImpl(feedUrl(domain, query), {
        headers: { "user-agent": "newsful/2 (+https://newsful.vercel.app)" },
        signal: AbortSignal.timeout(FEED_TIMEOUT_MS),
      });
      if (!response.ok) {
        throw new Error(`Feed for ${domain} failed (${response.status})`);
      }
      return parseFeed(await response.text(), lane.id).map((article) => ({
        ...article,
        source: article.source || PUBLISHER_FEEDS[domain]?.source || null,
      }));
    }),
  );

  // Newest first within each outlet, then take turns between outlets so a
  // prolific feed can't crowd the others out of the lane.
  const queues = perDomain.map((result) =>
    result.status === "fulfilled"
      ? result.value.toSorted((a, b) =>
          (b.published ?? "").localeCompare(a.published ?? ""),
        )
      : [],
  );
  const seen = new Set();
  const articles = [];
  const longest = Math.max(0, ...queues.map((queue) => queue.length));
  for (let i = 0; i < longest && articles.length < ARTICLES_PER_LANE; i += 1) {
    for (const queue of queues) {
      const article = queue[i];
      if (!article || seen.has(article.url)) continue;
      if (articles.length >= ARTICLES_PER_LANE) break;
      seen.add(article.url);
      articles.push(article);
    }
  }

  return enrichImages ? enrichArticleImages(articles, fetchImpl) : articles;
}

// Returns { liberal: [...], conservative: [...], neutral: [...] }.
export async function getNews(
  query = "",
  { fetchImpl = fetch, enrichImages = true } = {},
) {
  const cacheKey = query.toLowerCase();
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }

  try {
    const lanes = await Promise.all(
      LANES.map((lane) => fetchLane(lane, query, fetchImpl, enrichImages)),
    );
    const data = Object.fromEntries(
      LANES.map((lane, i) => [lane.id, lanes[i]]),
    );

    if (Object.values(data).every((articles) => articles.length === 0)) {
      throw new Error("All news feeds came back empty");
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
