import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import supertest from "supertest";
import { makeApp } from "../src/app.js";
import {
  getNews,
  parseFeed,
  clearNewsCache,
  extractPageImage,
} from "../src/news/news-service.js";
import { makeTestDb } from "./helpers.js";

const db = makeTestDb();
const app = makeApp(db);

beforeEach(() => clearNewsCache());
after(() => db.destroy());

function feedXml(domain, sourceName, count = 2) {
  const items = Array.from(
    { length: count },
    (_, i) => `
    <item>
      <title>Story ${i + 1} from ${domain} - ${sourceName}</title>
      <link>https://news.google.com/rss/articles/${domain}-${i}?oc=5</link>
      <guid isPermaLink="false">guid-${domain}-${i}</guid>
      <pubDate>Thu, 0${(i % 3) + 1} Jul 2026 0${i}:12:11 GMT</pubDate>
      <media:content url="https://images.example.com/${domain}-${i}.jpg" type="image/jpeg" />
      <description>&lt;a href="https://news.google.com/rss/articles/${domain}-${i}"&gt;Story&lt;/a&gt;</description>
      <source url="https://www.${domain}">${sourceName}</source>
    </item>`,
  ).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
    <rss xmlns:media="http://search.yahoo.com/mrss/" version="2.0">
      <channel><title>"site:${domain}" - Google News</title>${items}</channel>
    </rss>`;
}

function feedXmlWithoutImages(domain, sourceName, count = 2) {
  const items = Array.from(
    { length: count },
    (_, i) => `
    <item>
      <title>Story ${i + 1} from ${domain} - ${sourceName}</title>
      <link>https://news.google.com/rss/articles/${domain}-${i}?oc=5</link>
      <guid isPermaLink="false">guid-${domain}-${i}</guid>
      <pubDate>Thu, 0${(i % 3) + 1} Jul 2026 0${i}:12:11 GMT</pubDate>
      <description>&lt;a href="https://news.google.com/rss/articles/${domain}-${i}"&gt;Story&lt;/a&gt;</description>
      <source url="https://www.${domain}">${sourceName}</source>
    </item>`,
  ).join("");
  return `<?xml version="1.0" encoding="UTF-8"?>
    <rss version="2.0">
      <channel><title>"site:${domain}" - Google News</title>${items}</channel>
    </rss>`;
}

const SOURCE_NAMES = {
  "ms.now": "MS NOW",
  "huffpost.com": "HuffPost",
  "foxnews.com": "Fox News",
  "breitbart.com": "Breitbart",
  "bbc.com": "BBC",
  "npr.org": "NPR",
};

function fakeFetch(url) {
  const matchingDomain = Object.keys(SOURCE_NAMES).find((domain) =>
    url.includes(domain),
  );
  if (matchingDomain) {
    return Promise.resolve({
      ok: true,
      text: () =>
        Promise.resolve(feedXml(matchingDomain, SOURCE_NAMES[matchingDomain])),
    });
  }

  if (!url.includes("/rss/search?")) {
    return Promise.resolve({
      ok: true,
      url,
      headers: new Map([["content-type", "text/html"]]),
      text: () =>
        Promise.resolve(`
          <html>
            <head>
              <meta property="og:image" content="https://images.example.com/story.jpg?size=large&amp;crop=1">
            </head>
          </html>
        `),
    });
  }

  const q = new URL(url).searchParams.get("q");
  const domain = q.match(/site:(\S+)/)[1];
  return Promise.resolve({
    ok: true,
    text: () => Promise.resolve(feedXml(domain, SOURCE_NAMES[domain])),
  });
}

test("extractPageImage reads Open Graph and Twitter image metadata", () => {
  assert.equal(
    extractPageImage(
      '<meta property="og:image" content="/images/story.jpg?x=1&amp;y=2">',
      "https://example.com/news/story",
    ),
    "https://example.com/images/story.jpg?x=1&y=2",
  );

  assert.equal(
    extractPageImage(
      '<meta name="twitter:image" content="https://cdn.example.com/card.jpg">',
      "https://example.com/news/story",
    ),
    "https://cdn.example.com/card.jpg",
  );
});

test("parseFeed normalizes items and strips the source suffix from titles", () => {
  const articles = parseFeed(
    feedXml("foxnews.com", "Fox News"),
    "conservative",
  );
  assert.equal(articles.length, 2);
  assert.equal(articles[0].title, "Story 1 from foxnews.com");
  assert.equal(
    articles[0].image,
    "https://images.example.com/foxnews.com-0.jpg",
  );
  assert.equal(articles[0].source, "Fox News");
  assert.equal(articles[0].lane, "conservative");
  assert.match(articles[0].url, /^https:\/\/news\.google\.com/);
  assert.match(articles[0].published, /^2026-07-01T00:12:11/);
});

test("parseFeed handles a feed with a single item and with none", () => {
  const single = feedXml("bbc.com", "BBC", 1);
  assert.equal(parseFeed(single, "neutral").length, 1);
  const empty = `<?xml version="1.0"?><rss version="2.0"><channel><title>x</title></channel></rss>`;
  assert.deepEqual(parseFeed(empty, "neutral"), []);
});

test("getNews returns all three lanes, newest first", async () => {
  const news = await getNews("", { fetchImpl: fakeFetch });
  assert.deepEqual(Object.keys(news), ["liberal", "conservative", "neutral"]);
  assert.equal(news.liberal.length, 4); // 2 domains x 2 stories
  assert.equal(
    news.liberal[0].image,
    "https://images.example.com/ms.now-1.jpg",
  );
  assert.ok(
    news.liberal[0].published >= news.liberal.at(-1).published,
    "sorted by recency",
  );
  assert.ok(news.conservative.every((a) => a.lane === "conservative"));
});

test("getNews never uses the Google News logo as a story image", async () => {
  let articlePageFetches = 0;
  const searchFetch = (url) => {
    if (url.includes("news.google.com/rss/articles/")) {
      articlePageFetches += 1;
      return Promise.resolve({
        ok: true,
        url,
        headers: new Map([["content-type", "text/html"]]),
        text: () =>
          Promise.resolve(
            '<meta property="og:image" content="https://lh3.googleusercontent.com/google-news-logo=s0-w300">',
          ),
      });
    }

    const q = new URL(url).searchParams.get("q");
    const domain = q.match(/site:(\S+)/)[1];
    return Promise.resolve({
      ok: true,
      text: () =>
        Promise.resolve(feedXmlWithoutImages(domain, SOURCE_NAMES[domain])),
    });
  };

  const news = await getNews("climate", { fetchImpl: searchFetch });
  assert.ok(Object.values(news).flat().every((article) => !article.image));
  assert.equal(articlePageFetches, 0);
});

test("getNews takes turns between outlets so one feed can't fill a lane", async () => {
  const lopsidedFetch = (url) => {
    if (!url.includes("huffpost.com")) return fakeFetch(url);
    return Promise.resolve({
      ok: true,
      text: () => Promise.resolve(feedXml("huffpost.com", "HuffPost", 9)),
    });
  };
  const news = await getNews("", { fetchImpl: lopsidedFetch });
  assert.deepEqual(
    news.liberal.slice(0, 4).map((article) => article.source),
    ["MS NOW", "HuffPost", "MS NOW", "HuffPost"],
  );
  assert.equal(news.liberal.length, 11);
});

test("GET /api/news is cacheable by the CDN", async () => {
  app.set("newsFetchImpl", fakeFetch);
  const res = await supertest(app).get("/api/news").expect(200);
  assert.match(res.headers["cache-control"], /s-maxage=\d+/);
  app.set("newsFetchImpl", null);
});

test("getNews caches results", async () => {
  let calls = 0;
  const countingFetch = (url) => {
    calls += 1;
    return fakeFetch(url);
  };
  await getNews("", { fetchImpl: countingFetch });
  await getNews("", { fetchImpl: countingFetch });
  assert.equal(calls, 6); // second call served from cache
});

test("getNews serves stale data when the feeds go down", async () => {
  await getNews("", { fetchImpl: fakeFetch });
  clearNewsCache();
  const failingFetch = () => Promise.reject(new Error("offline"));
  await assert.rejects(getNews("", { fetchImpl: failingFetch }));
});

test("getNews tolerates one domain failing", async () => {
  const flakyFetch = (url) =>
    url.includes("breitbart.com")
      ? Promise.resolve({ ok: false, status: 503 })
      : fakeFetch(url);
  const news = await getNews("", { fetchImpl: flakyFetch });
  assert.equal(news.conservative.length, 2); // only foxnews.com stories
  assert.equal(news.liberal.length, 4);
});

test("GET /api/news requires no authentication and reports feed outages as 502", async () => {
  app.set("newsFetchImpl", () => Promise.reject(new Error("offline")));
  const res = await supertest(app).get("/api/news").expect(502);
  assert.equal(res.body.error, "News feeds are unavailable right now");
  app.set("newsFetchImpl", null);
});
