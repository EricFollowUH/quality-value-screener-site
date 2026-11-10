import bundledSnapshot from "../../public/data/us-market-scores.json" with { type: "json" };

const DEFAULT_MARKET_SNAPSHOT_URL =
  "https://ericfollowuh.github.io/quality-value-screener-site/data/us-market-scores.json";

const SORT_KEYS = new Set([
  "totalScore",
  "growth",
  "quality",
  "cashFlow",
  "valuation",
  "risk",
  "sustainability"
]);

const DIMENSION_MINIMUM_PARAMS = [
  ["growth", "minGrowth"],
  ["quality", "minQuality"],
  ["cashFlow", "minCashFlow"],
  ["valuation", "minValuation"],
  ["risk", "minRisk"],
  ["sustainability", "minSustainability"]
];

const CACHE_TTL_MS = 15 * 60 * 1000;
let cachedSnapshot = null;
let cachedAt = 0;

export function resolveMarketSnapshotUrl(env = process.env) {
  if (env.US_MARKET_SNAPSHOT_URL) return env.US_MARKET_SNAPSHOT_URL;
  return DEFAULT_MARKET_SNAPSHOT_URL;
}

export function selectCompatibleSnapshot(remote, bundled = bundledSnapshot) {
  if (remote?.modelVersion !== bundled.modelVersion || !remote?.scores?.length) return bundled;
  if (remote.validation?.passed!==true) return bundled;
  return Date.parse(remote.generatedAt) >= Date.parse(bundled.generatedAt) ? remote : bundled;
}

function numberParam(value, fallback, minimum, maximum) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(minimum, Math.min(maximum, parsed));
}

function compareScores(a, b, sortKey) {
  const primary = Number(b?.[sortKey] || 0) - Number(a?.[sortKey] || 0);
  if (primary !== 0) return primary;
  const total = Number(b?.totalScore || 0) - Number(a?.totalScore || 0);
  if (total !== 0) return total;
  return String(a?.ticker || "").localeCompare(String(b?.ticker || ""));
}

export async function loadMarketSnapshot() {
  if (cachedSnapshot && Date.now() - cachedAt < CACHE_TTL_MS) return cachedSnapshot;

  const url = resolveMarketSnapshotUrl();
  let snapshot = bundledSnapshot;
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "quality-value-screener/1.0" },
      signal: AbortSignal.timeout(20_000)
    });
    if (!response.ok) throw new Error(`Market snapshot returned ${response.status}`);
    snapshot = selectCompatibleSnapshot(await response.json());
  } catch (error) {
    console.warn("Weekly source unavailable; serving the deployed versioned snapshot.", error.message);
  }

  cachedSnapshot = snapshot;
  cachedAt = Date.now();
  return snapshot;
}

export function queryMarketSnapshot(snapshot, query = {}) {
  const sortKey = SORT_KEYS.has(String(query.sort || "")) ? String(query.sort) : "totalScore";
  const minScore = numberParam(query.minScore, 0, 0, 30);
  const minDimensionScore = numberParam(query.minDimensionScore, 0, 0, 5);
  const dimensionMinimums = Object.fromEntries(
    DIMENSION_MINIMUM_PARAMS.map(([dimension, param]) => [dimension, numberParam(query[param], 0, 0, 5)])
  );
  const limit = Math.round(numberParam(query.limit, 100, 1, 200));
  const template = String(query.template || "").trim().toLowerCase();
  const search = String(query.q || "").trim().toLowerCase();

  const scores = snapshot.scores
    .filter((stock) => {
      if (!search && query.includeUnverified!=='true' && stock.rankEligible!==true) return false;
      if (!search && query.includeUnverified!=='true' && snapshot.modelVersion==='2.2.0' && Date.now()-Date.parse(snapshot.generatedAt)>48*3600000) return false;
      if (Number(stock.totalScore || 0) < minScore) return false;
      if (sortKey !== "totalScore" && Number(stock[sortKey] || 0) < minDimensionScore) return false;
      if (DIMENSION_MINIMUM_PARAMS.some(([dimension]) => Number(stock[dimension] || 0) < dimensionMinimums[dimension])) return false;
      if (template && String(stock.template || "").toLowerCase() !== template) return false;
      if (!search) return true;
      const haystack = [stock.ticker, stock.name, stock.sector, stock.industry, stock.template]
        .join(" ")
        .toLowerCase();
      return search.split(/\s+/).every((token) => haystack.includes(token));
    })
    .sort((a, b) => compareScores(a, b, sortKey));

  return {
    ...snapshot,
    source: `${snapshot.source} 当前结果按${sortKey === "totalScore" ? "总分" : sortKey}从全量可评分池筛选。`,
    featuredTickers: scores.slice(0, 5).map((stock) => stock.ticker),
    coverage: {
      ...(snapshot.coverage || {}),
      matchedCount: scores.length,
      rankEligibleCount: snapshot.scores.filter(s=>s.rankEligible===true).length,
      returnedCount: Math.min(scores.length, limit)
    },
    scores: scores.slice(0, limit)
  };
}
