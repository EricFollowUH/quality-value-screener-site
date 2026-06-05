import { searchUniverse } from "./lib/aShareScreener.js";

export default function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=1800");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const q = String(req.query.q || "").trim();
  if (!q) {
    res.status(200).json({ matches: [] });
    return;
  }

  res.status(200).json({ matches: searchUniverse(q, 10) });
}
