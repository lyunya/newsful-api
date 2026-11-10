import express from "express";
import { getStories } from "./stories-service.js";
import { newsRateLimit } from "../middleware/rate-limit.js";

const storiesRouter = express.Router();

storiesRouter.get("/", newsRateLimit, async (req, res) => {
  try {
    const stories = await getStories({
      fetchImpl: req.app.get("newsFetchImpl") || fetch,
    });
    res.set(
      "Cache-Control",
      "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
    );
    res.json(stories);
  } catch (error) {
    console.error("Story feeds unavailable:", error.message);
    res.status(502).json({ error: "Story feeds are unavailable right now" });
  }
});

export default storiesRouter;
