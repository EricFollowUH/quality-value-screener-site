import { buildAShareSnapshot } from "./lib/aShareScreener.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  try {
    const tickers = String(req.query.tickers || "")
      .split(",")
      .map((ticker) => ticker.trim())
      .filter(Boolean);
    const q = String(req.query.q || "").trim();
    const snapshot = await buildAShareSnapshot({ tickers, q });
    res.status(200).json(snapshot);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "A-share snapshot unavailable"
    });
  }
}
