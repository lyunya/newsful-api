// Feeds that story matching draws on. The pool is deliberately wider than the
// three home-page lanes: outlets only overlap on a story if enough of them
// cover the same beat (mostly US politics and national news).
const googleNews = (site) =>
  `https://news.google.com/rss/search?${new URLSearchParams({
    q: `site:${site} when:2d`,
    hl: "en-US",
    gl: "US",
    ceid: "US:en",
  })}`;

export const STORY_SOURCES = [
  // Liberal
  { lane: "liberal", source: "MS NOW", url: googleNews("ms.now") },
  { lane: "liberal", source: "CNN", url: googleNews("cnn.com") },
  {
    lane: "liberal",
    source: "HuffPost",
    url: "https://www.huffpost.com/section/politics/feed",
  },
  {
    lane: "liberal",
    source: "The Guardian",
    url: "https://www.theguardian.com/us-news/rss",
  },

  // Conservative
  {
    lane: "conservative",
    source: "Fox News",
    url: "https://moxie.foxnews.com/google-publisher/latest.xml",
  },
  {
    lane: "conservative",
    source: "Fox News",
    url: "https://moxie.foxnews.com/google-publisher/politics.xml",
  },
  {
    lane: "conservative",
    source: "Breitbart",
    url: "https://feeds.feedburner.com/breitbart",
  },
  {
    lane: "conservative",
    source: "New York Post",
    url: "https://nypost.com/news/feed/",
  },
  {
    lane: "conservative",
    source: "New York Post",
    url: "https://nypost.com/politics/feed/",
  },
  {
    lane: "conservative",
    source: "Washington Times",
    url: "https://www.washingtontimes.com/rss/headlines/news/politics/",
  },

  // Neutral
  { lane: "neutral", source: "AP", url: googleNews("apnews.com") },
  { lane: "neutral", source: "Reuters", url: googleNews("reuters.com") },
  {
    lane: "neutral",
    source: "BBC",
    url: "https://feeds.bbci.co.uk/news/rss.xml",
  },
  {
    lane: "neutral",
    source: "BBC",
    url: "https://feeds.bbci.co.uk/news/world/us_and_canada/rss.xml",
  },
  { lane: "neutral", source: "NPR", url: "https://feeds.npr.org/1001/rss.xml" },
  { lane: "neutral", source: "NPR", url: "https://feeds.npr.org/1014/rss.xml" },
  {
    lane: "neutral",
    source: "PBS News",
    url: "https://www.pbs.org/newshour/feeds/rss/headlines",
  },
  { lane: "neutral", source: "The Hill", url: "https://thehill.com/news/feed/" },
];
