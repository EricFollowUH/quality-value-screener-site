import { DEFAULT_TICKERS, FEATURED_TICKERS, screenTickers } from "./lib/liveScreener.js";

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

  const list = tickers.length ? tickers : DEFAULT_TICKERS;

  try {
    const scores = await screenTickers(list);
    res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=900");
    res.status(200).json({
      generatedAt: new Date().toISOString(),
      cadence: "live",
      source: "Live server scoring: SEC fundamentals + public market price.",
      featuredTickers: FEATURED_TICKERS,
      scores
    });
  } catch (error) {
    res.status(502).json({
      error: error instanceof Error ? error.message : "Failed to calculate live screen.",
      generatedAt: new Date().toISOString()
    });
  }
}
