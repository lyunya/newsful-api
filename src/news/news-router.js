import express from "express";
import { getNews } from "./news-service.js";
import { newsRateLimit } from "../middleware/rate-limit.js";

const newsRouter = express.Router();

newsRouter.get("/", newsRateLimit, async (req, res) => {
  const query = String(req.query.q ?? "")
    .trim()
    .slice(0, 100);

  try {
    const news = await getNews(query, {
      fetchImpl: req.app.get("newsFetchImpl") || fetch,
    });
    // Let the CDN answer repeat requests so most visitors never reach the
    // function; stale copies are served while a fresh one is fetched.
    res.set(
      "Cache-Control",
      "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
    );
    res.json(news);
  } catch (error) {
    console.error("News feeds unavailable:", error.message);
    res.status(502).json({ error: "News feeds are unavailable right now" });
  }
});

export default newsRouter;
