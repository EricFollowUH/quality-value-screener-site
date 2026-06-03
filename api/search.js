import { searchCompanies } from "./lib/liveScreener.js";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  const query = String(req.query?.q || "").trim();

  try {
    const matches = await searchCompanies(query, 8);
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=3600");
    res.status(200).json({
      generatedAt: new Date().toISOString(),
      query,
      matches
    });
  } catch (error) {
    res.status(502).json({
      error: error instanceof Error ? error.message : "Company search failed.",
      generatedAt: new Date().toISOString(),
      query,
      matches: []
    });
  }
}
