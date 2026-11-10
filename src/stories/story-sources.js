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
  {
    lane: "liberal",
    source: "NBC News",
    url: "https://feeds.nbcnews.com/nbcnews/public/politics",
  },
  {
    lane: "liberal",
    source: "CBS News",
    url: "https://www.cbsnews.com/latest/rss/politics",
  },
  {
    lane: "liberal",
    source: "ABC News",
    url: "https://abcnews.go.com/abcnews/politicsheadlines",
  },
  {
    lane: "liberal",
    source: "New York Times",
    url: "https://rss.nytimes.com/services/xml/rss/nyt/Politics.xml",
  },
  {
    lane: "liberal",
    source: "New York Times",
    url: "https://rss.nytimes.com/services/xml/rss/nyt/US.xml",
  },
  {
    lane: "liberal",
    source: "Washington Post",
    url: googleNews("washingtonpost.com"),
  },
  { lane: "liberal", source: "Axios", url: "https://api.axios.com/feed/" },

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
  {
    lane: "conservative",
    source: "Fox News",
    url: "https://moxie.foxnews.com/google-publisher/us.xml",
  },
  {
    lane: "conservative",
    source: "Washington Examiner",
    url: googleNews("washingtonexaminer.com"),
  },
  {
    lane: "conservative",
    source: "New York Sun",
    url: googleNews("nysun.com"),
  },
  {
    lane: "conservative",
    source: "Just the News",
    url: "https://justthenews.com/rss.xml",
  },
  {
    lane: "conservative",
    source: "Daily Signal",
    url: "https://www.dailysignal.com/feed/",
  },
  {
    lane: "conservative",
    source: "Daily Caller",
    url: "https://dailycaller.com/feed/",
  },
  {
    lane: "conservative",
    source: "Daily Wire",
    url: "https://www.dailywire.com/feeds/rss.xml",
  },
  {
    lane: "conservative",
    source: "National Review",
    url: "https://www.nationalreview.com/feed/",
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
  {
    lane: "neutral",
    source: "PBS News",
    url: "https://www.pbs.org/newshour/feeds/rss/politics",
  },
  { lane: "neutral", source: "The Hill", url: "https://thehill.com/feed/" },
  {
    lane: "neutral",
    source: "UPI",
    url: "https://rss.upi.com/news/top_news.rss",
  },
  { lane: "neutral", source: "Semafor", url: googleNews("semafor.com") },
  { lane: "neutral", source: "Bloomberg", url: googleNews("bloomberg.com") },
  {
    lane: "neutral",
    source: "Wall Street Journal",
    url: "https://feeds.content.dowjones.io/public/rss/RSSUSnews",
  },
  {
    lane: "neutral",
    source: "Wall Street Journal",
    url: "https://feeds.content.dowjones.io/public/rss/RSSWorldNews",
  },
  {
    lane: "neutral",
    source: "Al Jazeera",
    url: "https://www.aljazeera.com/xml/rss/all.xml",
  },
  { lane: "neutral", source: "Newsweek", url: "https://www.newsweek.com/rss" },
  {
    lane: "neutral",
    source: "NewsNation",
    url: "https://www.newsnationnow.com/feed/",
  },
];
