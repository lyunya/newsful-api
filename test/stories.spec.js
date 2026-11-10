import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import supertest from "supertest";
import { makeApp } from "../src/app.js";
import { matchStories, tokenize } from "../src/stories/story-matcher.js";
import {
  getStories,
  clearStoriesCache,
} from "../src/stories/stories-service.js";
import { decodeEntities, parseFeed } from "../src/news/news-service.js";
import { STORY_SOURCES } from "../src/stories/story-sources.js";
import { makeTestDb } from "./helpers.js";

// Real headlines captured from the story feeds on 2026-11-10 (titles only).
const headlines = JSON.parse(
  fs.readFileSync(
    new URL("./fixtures/story-headlines.json", import.meta.url),
    "utf8",
  ),
);

const db = makeTestDb();
const app = makeApp(db);

beforeEach(() => clearStoriesCache());
after(() => db.destroy());

const article = (lane, source, title, hour = 12) => ({
  title,
  url: `https://example.com/${source}/${encodeURIComponent(title)}`,
  source,
  lane,
  published: `2026-11-10T${String(hour).padStart(2, "0")}:00:00.000Z`,
});

const members = (story) => Object.values(story.lanes).flat();
const storyAbout = (stories, pattern) =>
  stories.find((story) => pattern.test(story.title));

test("tokenize drops filler words and normalizes endings", () => {
  assert.deepEqual(tokenize("voting"), tokenize("voted"));
  assert.deepEqual(tokenize("The U.S. Senate's votes are delayed"), [
    "us",
    "senat",
    "vot",
    "delay",
  ]);
});

test("decodeEntities repairs double-encoded headlines", () => {
  assert.equal(decodeEntities("Trump&#039;s plan &amp; more"), "Trump's plan & more");
  const [parsed] = parseFeed(
    `<rss><channel><item><title>Boss&amp;#039;s plan</title><link>https://x.test/a</link></item></channel></rss>`,
    "neutral",
  );
  assert.equal(parsed.title, "Boss's plan");
});

test("matchStories groups the same story across lanes", () => {
  const stories = matchStories([
    article("liberal", "HuffPost", "House Republicans Pick Jim Jordan As Next Leader"),
    article("conservative", "Breitbart", "Ohio's Jim Jordan Will Lead House Republicans in Next Congress"),
    article("neutral", "NPR", "House Republicans elect Jim Jordan as their next leader"),
    article("neutral", "BBC", "Why does Australia want Brits to swap Sydney for the outback?"),
    article("liberal", "CNN", "Ohio State suspends fraternity after hazing video"),
  ]);
  assert.equal(stories.length, 1);
  assert.deepEqual(stories[0].missingLanes, []);
  assert.equal(stories[0].outletCount, 3);
  assert.equal(stories[0].title, "House Republicans elect Jim Jordan as their next leader");
});

test("matchStories reports a lane with no coverage", () => {
  const [story] = matchStories([
    article("liberal", "CNN", "Judge jails Thomas Markle after he cut off his ankle monitor"),
    article("neutral", "AP", "Thomas Markle jailed after cutting off ankle monitor, judge rules"),
    article("conservative", "Fox News", "Rory McIlroy shares thoughts on golf rival"),
  ]);
  assert.deepEqual(story.missingLanes, ["conservative"]);
});

test("matchStories ignores stories only one lane covers, wire reprints, and stale matches", () => {
  const sameLane = matchStories([
    article("liberal", "CNN", "Senate passes sweeping farm subsidy overhaul"),
    article("liberal", "HuffPost", "Senate Passes Sweeping Farm Subsidy Overhaul Bill"),
  ]);
  assert.deepEqual(sameLane, []);

  const reprint = matchStories([
    article("neutral", "AP", "Press Forward completes journalism investments early"),
    article("conservative", "Washington Times", "Press Forward completes journalism investments early"),
  ]);
  assert.deepEqual(reprint, []);

  const daysApart = matchStories([
    { ...article("liberal", "CNN", "Senate passes sweeping farm subsidy overhaul"), published: "2026-11-08T01:00:00.000Z" },
    { ...article("neutral", "AP", "Senate passes sweeping farm subsidy overhaul bill"), published: "2026-11-10T20:00:00.000Z" },
  ]);
  assert.deepEqual(daysApart, []);
});

test("matchStories finds the day's big stories in real headlines", () => {
  const stories = matchStories(headlines, { limit: 100 });

  for (const [pattern, minOutlets] of [
    [/Jim Jordan/, 6],
    [/billionaire/i, 5],
    [/soldier/i, 5],
    [/Big Bend|border wall/i, 4],
  ]) {
    const story = storyAbout(stories, pattern);
    assert.ok(story, `expected a story matching ${pattern}`);
    assert.deepEqual(story.missingLanes, [], `${pattern} covered by all lanes`);
    assert.ok(story.outletCount >= minOutlets, `${pattern}: ${story.outletCount} outlets`);
  }
});

test("matchStories keeps different stories apart in real headlines", () => {
  const stories = matchStories(headlines, { limit: 100 });
  const mixes = (story, a, b) => {
    const titles = members(story).map((m) => m.title);
    return titles.some((t) => a.test(t)) && titles.some((t) => b.test(t));
  };

  for (const story of stories) {
    assert.ok(!mixes(story, /Jim Jordan/, /Thune/), "House and Senate leadership races are separate");
    assert.ok(!mixes(story, /Anthropic/, /Huang/), "Anthropic IPO and Nvidia CEO are separate");
    assert.ok(!mixes(story, /billionaire/i, /soldier/i));

    const sources = members(story).map((m) => m.source);
    assert.equal(new Set(sources).size, sources.length, "one headline per outlet");
    assert.ok(story.missingLanes.length <= 1, "at least two lanes");
    assert.ok(members(story).every((m) => !("summary" in m)));
  }

  const jordan = storyAbout(stories, /Jim Jordan/);
  assert.ok(members(jordan).every((m) => /Jordan/.test(m.title)));
});

// Every feed carries the same story, worded differently per lane.
function storyFeedFetch(url) {
  const { lane } = STORY_SOURCES.find((source) => source.url === url);
  const title = {
    liberal: "House Republicans Pick Jim Jordan As Next Leader",
    conservative:
      "Rep. Jim Jordan elected next House Republican leader after midterms",
    neutral: "House Republicans elect Jim Jordan as their next leader",
  }[lane];
  const outlet = new URL(url).searchParams.get("q") ?? new URL(url).pathname;
  return Promise.resolve({
    ok: true,
    text: () =>
      Promise.resolve(`<rss><channel><item>
        <title>${title}</title>
        <link>https://example.com/${encodeURIComponent(new URL(url).hostname + outlet)}</link>
        <pubDate>${new Date().toUTCString()}</pubDate>
        <description>House Republicans chose a new leader on Tuesday.</description>
      </item></channel></rss>`),
  });
}

test("getStories builds stories from the feeds and caches them", async () => {
  let calls = 0;
  const countingFetch = (url) => {
    calls += 1;
    return storyFeedFetch(url);
  };
  const first = await getStories({ fetchImpl: countingFetch });
  assert.equal(first.stories.length, 1);
  assert.deepEqual(first.stories[0].missingLanes, []);
  assert.ok(first.outlets >= 10);

  const callsAfterFirst = calls;
  await getStories({ fetchImpl: countingFetch });
  assert.equal(calls, callsAfterFirst);
});

test("GET /api/stories needs no auth, is CDN-cacheable, and reports outages as 502", async () => {
  app.set("newsFetchImpl", storyFeedFetch);
  const ok = await supertest(app).get("/api/stories").expect(200);
  assert.equal(ok.body.stories.length, 1);
  assert.match(ok.headers["cache-control"], /s-maxage=\d+/);

  clearStoriesCache();
  app.set("newsFetchImpl", () => Promise.reject(new Error("offline")));
  const down = await supertest(app).get("/api/stories").expect(502);
  assert.equal(down.body.error, "Story feeds are unavailable right now");
  app.set("newsFetchImpl", null);
});
