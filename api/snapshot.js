import { DEFAULT_TICKERS, FEATURED_TICKERS, resolveSearchUniverse, screenTickers } from "./lib/liveScreener.js";
import { loadMarketSnapshot, queryMarketSnapshot } from "./lib/marketSnapshot.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const tickers = String(req.query?.tickers || "")
    .split(",")
    .map((ticker) => ticker.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 30);
  const searchUniverse = resolveSearchUniverse(req.query?.q);

  const list = tickers.length ? tickers : searchUniverse || DEFAULT_TICKERS;

  try {
    if (!tickers.length) {
      try {
        const marketSnapshot = await loadMarketSnapshot();
        const result = queryMarketSnapshot(marketSnapshot, req.query || {});
        res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=3600");
        res.status(200).json(result);
        return;
      } catch (marketError) {
        console.warn("Full-market snapshot unavailable; using the compact live fallback.", marketError);
      }
    }

    const scores = await screenTickers(list);
    res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=900");
    res.status(200).json({
      modelVersion:'2.2.0',
      generatedAt: new Date().toISOString(),
      cadence: "live",
      source: searchUniverse
        ? `Live server scoring for ${String(req.query.q).trim()}: SEC fundamentals + public market price.`
        : "Compact live fallback: SEC fundamentals + public market price. Full-market snapshot is temporarily unavailable.",
      featuredTickers: FEATURED_TICKERS,
      coverage: {
        scope: "compact-fallback",
        listedCount: list.length,
        scoredCount: scores.filter((score) => score.totalScore > 0).length,
        matchedCount: scores.length,
        returnedCount: scores.length
      },
      scores
    });
  } catch (error) {
    res.status(502).json({
      error: error instanceof Error ? error.message : "Failed to calculate live screen.",
      generatedAt: new Date().toISOString()
    });
  }
}
