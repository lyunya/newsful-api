// Groups headlines from different outlets that report the same story.
//
// Every headline becomes a bag of words weighted by how rare each word is
// across the whole pool, and two headlines are compared by cosine similarity.
// Groups are grown by average link (a headline joins only if it resembles the
// group as a whole), which stops unrelated stories chaining together through
// one shared word. No model or API key involved.

const LANE_IDS = ["liberal", "conservative", "neutral"];

const STOP_WORDS = new Set(
  `a an the and or but of to in on for with at by from as is are was were be
  been being it its his her their our your this that these those after before
  over under into out up down new says say said saying will would could should
  can may might has have had not no he she they we you who what when where why
  how than then amid more most about against off again here there all any some
  just now still also back first last one two three get gets got make makes
  made take takes took live video watch latest update updates news report
  reports amp`
    .split(/\s+/)
    .filter(Boolean),
);

const MAX_HOURS_APART = 36;
const PAIR_THRESHOLD = 0.3; // similarity needed to consider two headlines
const LINK_THRESHOLD = 0.24; // average similarity needed to merge two groups
const MIN_SHARED_WORDS = 2;
const SUMMARY_WEIGHT = 0.35;
const MAX_PER_LANE = 3;
// Headlines that open with a format label make poor story titles.
const LABEL_PREFIX = /^(watch|live|exclusive|report|video|opinion|analysis)\b/i;

// Crude on purpose: it only has to make "votes", "voted" and "voting" land
// on the same token, not produce real words.
function stem(word) {
  let root = word;
  if (root.length > 5 && root.endsWith("ing")) root = root.slice(0, -3);
  else if (root.length > 4 && root.endsWith("ed")) root = root.slice(0, -2);
  else if (root.length > 3 && root.endsWith("s") && !root.endsWith("ss")) {
    root = root.slice(0, -1);
  }
  if (root.length > 3 && root.endsWith("e")) root = root.slice(0, -1);
  return root;
}

export function tokenize(text = "") {
  const words = String(text)
    .toLowerCase()
    .replace(/[’']s\b/g, "")
    .replace(/\bu\.s\.?(?=\s|$)/g, "us")
    .replace(/\bu\.k\.?(?=\s|$)/g, "uk")
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((word) => word.length > 1 && !STOP_WORDS.has(word))
    .map(stem);
  return [...new Set(words)];
}

function buildVectors(articles) {
  const docs = articles.map((article) => {
    const titleWords = tokenize(article.title);
    const titleSet = new Set(titleWords);
    // Aggregator feeds repeat the headline as the summary; that adds nothing.
    const summaryWords = tokenize(article.summary).filter(
      (word) => !titleSet.has(word),
    );
    return { titleWords, titleSet, summaryWords };
  });

  const documentFrequency = new Map();
  for (const doc of docs) {
    for (const word of [...doc.titleWords, ...doc.summaryWords]) {
      documentFrequency.set(word, (documentFrequency.get(word) ?? 0) + 1);
    }
  }
  // Smoothed so that words every headline shares still count for something
  // when the pool is small.
  const idf = (word) =>
    Math.log(1 + articles.length / (documentFrequency.get(word) ?? 1));

  return docs.map((doc) => {
    const weights = new Map();
    for (const word of doc.titleWords) weights.set(word, idf(word));
    for (const word of doc.summaryWords) {
      weights.set(word, idf(word) * SUMMARY_WEIGHT);
    }
    let norm = 0;
    for (const weight of weights.values()) norm += weight * weight;
    return { ...doc, weights, norm: Math.sqrt(norm) || 1 };
  });
}

function similarity(a, b) {
  const [small, large] =
    a.weights.size <= b.weights.size ? [a, b] : [b, a];
  let dot = 0;
  for (const [word, weight] of small.weights) {
    const other = large.weights.get(word);
    if (other) dot += weight * other;
  }
  return dot / (a.norm * b.norm);
}

function sharedTitleWords(a, b) {
  let shared = 0;
  for (const word of a.titleWords) if (b.titleSet.has(word)) shared += 1;
  return shared;
}

function hoursApart(a, b) {
  if (!a.published || !b.published) return 0;
  return Math.abs(Date.parse(a.published) - Date.parse(b.published)) / 3.6e6;
}

// Returns arrays of article indexes; singletons are left out.
function cluster(articles, vectors) {
  const n = articles.length;
  const sims = new Map(); // "i:j" (i < j) -> similarity, sparse
  const pairs = [];

  // Inverted index so only headlines sharing a word are compared.
  const byWord = new Map();
  vectors.forEach((vector, i) => {
    for (const word of vector.titleWords) {
      if (!byWord.has(word)) byWord.set(word, []);
      byWord.get(word).push(i);
    }
  });
  const candidates = new Set();
  for (const indexes of byWord.values()) {
    // Too common to be a useful signal (only meaningful in a large pool).
    if (indexes.length > Math.max(n / 4, 25)) continue;
    for (let a = 0; a < indexes.length; a += 1) {
      for (let b = a + 1; b < indexes.length; b += 1) {
        candidates.add(indexes[a] * n + indexes[b]);
      }
    }
  }

  for (const key of candidates) {
    const i = Math.floor(key / n);
    const j = key % n;
    if (articles[i].url === articles[j].url) continue;
    if (hoursApart(articles[i], articles[j]) > MAX_HOURS_APART) continue;
    if (sharedTitleWords(vectors[i], vectors[j]) < MIN_SHARED_WORDS) continue;
    const score = similarity(vectors[i], vectors[j]);
    if (score <= 0.05) continue;
    sims.set(`${i}:${j}`, score);
    if (score >= PAIR_THRESHOLD) pairs.push([score, i, j]);
  }
  pairs.sort((a, b) => b[0] - a[0]);

  const groupOf = articles.map((_, i) => i);
  const members = new Map(articles.map((_, i) => [i, [i]]));
  const simOf = (i, j) => sims.get(i < j ? `${i}:${j}` : `${j}:${i}`) ?? 0;

  for (const [, i, j] of pairs) {
    const a = groupOf[i];
    const b = groupOf[j];
    if (a === b) continue;
    const groupA = members.get(a);
    const groupB = members.get(b);
    let total = 0;
    for (const x of groupA) for (const y of groupB) total += simOf(x, y);
    if (total / (groupA.length * groupB.length) < LINK_THRESHOLD) continue;
    for (const y of groupB) groupOf[y] = a;
    members.set(a, groupA.concat(groupB));
    members.delete(b);
  }

  return {
    groups: [...members.values()].filter((group) => group.length > 1),
    simOf,
  };
}

function storyId(urls) {
  // Small stable hash of the member URLs; good enough for React keys.
  let hash = 5381;
  for (const char of [...urls].sort().join("|")) {
    hash = ((hash << 5) + hash + char.charCodeAt(0)) >>> 0;
  }
  return hash.toString(36);
}

// articles: [{ title, url, source, lane, published, image?, summary? }]
// Returns stories covered by at least two lanes and two outlets, best first.
export function matchStories(articles, { limit = 12 } = {}) {
  const vectors = buildVectors(articles);
  const { groups, simOf } = cluster(articles, vectors);

  const stories = [];
  for (const group of groups) {
    // How typical each headline is of its group; the most typical leads.
    const centrality = new Map(
      group.map((i) => [
        i,
        group.reduce((sum, j) => (i === j ? sum : sum + simOf(i, j)), 0),
      ]),
    );
    const ranked = [...group].sort(
      (a, b) => centrality.get(b) - centrality.get(a),
    );

    const lanes = Object.fromEntries(LANE_IDS.map((id) => [id, []]));
    const outlets = new Set();
    const wordings = new Set();
    for (const index of ranked) {
      const article = articles[index];
      const lane = lanes[article.lane];
      if (!lane) continue;
      // One headline per outlet keeps a prolific outlet from filling a lane.
      if (outlets.has(article.source)) continue;
      // A wire story reprinted under the same headline isn't a second view.
      const wording = [...vectors[index].titleWords].sort().join(" ");
      if (wordings.has(wording)) continue;
      wordings.add(wording);
      outlets.add(article.source);
      if (lane.length < MAX_PER_LANE) {
        const { summary, ...publicFields } = article;
        lane.push(publicFields);
      }
    }

    const coveredLanes = LANE_IDS.filter((id) => lanes[id].length > 0);
    if (coveredLanes.length < 2 || outlets.size < 2) continue;

    // Prefer a neutral outlet's wording for the story's own headline.
    const candidates = [
      ...lanes.neutral,
      ...ranked.map((i) => articles[i]),
    ];
    const lead =
      candidates.find((article) => !LABEL_PREFIX.test(article.title)) ??
      candidates[0];
    const published = group
      .map((i) => articles[i].published)
      .filter(Boolean)
      .sort();

    stories.push({
      id: storyId(group.map((i) => articles[i].url)),
      title: lead.title,
      lanes,
      missingLanes: LANE_IDS.filter((id) => lanes[id].length === 0),
      outletCount: outlets.size,
      latest: published.at(-1) ?? null,
    });
  }

  return stories
    .sort(
      (a, b) =>
        a.missingLanes.length - b.missingLanes.length ||
        b.outletCount - a.outletCount ||
        (b.latest ?? "").localeCompare(a.latest ?? ""),
    )
    .slice(0, limit);
}
