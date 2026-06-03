const DEFAULT_TICKERS = [
  "MSFT",
  "NVDA",
  "V",
  "GOOGL",
  "UNH",
  "META",
  "ADBE",
  "CRM",
  "AMZN",
  "ASML",
  "LLY",
  "AVGO",
  "JPM",
  "MA",
  "ORCL",
  "AMD",
  "NOW",
  "PLTR",
  "TSM",
  "COST",
  "HD",
  "NKE",
  "XOM",
  "NEE",
  "AMT"
];

const DIMENSIONS = ["growth", "quality", "cashFlow", "valuation", "risk", "sustainability"];

const BASE_SCORES = [
  ["NVDA", "NVIDIA Corporation", "Technology", "Semiconductors", "Semiconductors / chip design", 216.51, [5, 5, 4, 5, 5, 5], [0.852, 17.145, 0.009, 0.741, 0.656]],
  ["META", "Meta Platforms, Inc.", "Communication Services", "Internet Content & Information", "AI / cloud / platform technology", 616.39, [5, 5, 4, 5, 4, 5], [0.331, 17.045, 0.016, 0.819, 0.406]],
  ["V", "Visa Inc.", "Financial Services", "Credit Services", "Payment networks / financial infrastructure", 309.8, [5, 5, 5, 4, 4, 5], [0.171, 20.873, 0.035, 0.978, 0.673]],
  ["ADBE", "Adobe Inc.", "Technology", "Software - Application", "SaaS / enterprise software", 255.36, [3, 5, 5, 5, 5, 5], [0.12, 9.678, 0.09, 0.894, 0.388]],
  ["MSFT", "Microsoft Corporation", "Technology", "Software - Infrastructure", "SaaS / enterprise software", 426.47, [4, 4, 4, 4, 4, 5], [0.183, 22.048, 0.012, 0.683, 0.463]],
  ["GOOGL", "Alphabet Inc.", "Communication Services", "Internet Content & Information", "AI / cloud / platform technology", 360.31, [4, 4, 3, 4, 5, 5], [0.218, 24.857, 0.006, 0.604, 0.361]],
  ["UNH", "UnitedHealth Group Incorporated", "Healthcare", "Healthcare Plans", "General quality/value", 381.35, [2, 0, 4, 4, 3, 3], [0.02, 18.272, 0.051, 0.188, 0.08]],
  ["CRM", "Salesforce, Inc.", "Technology", "Software - Application", "SaaS / enterprise software", 192.3, [3, 4, 5, 5, 3, 5], [0.133, 12.374, 0.105, 0.776, 0.218]],
  ["LLY", "Eli Lilly and Company", "Healthcare", "Drug Manufacturers - General", "General quality/value", 1081, [5, 5, 4, 4, 4, 5], [0.555, 24.308, 0.009, 0.828, 0.494]],
  ["AMT", "American Tower Corporation", "Real Estate", "REIT - Specialty", "REITs", 187.33, [4, 5, 5, 4, 1, 5], [0.068, 27.124, 0.053, 0.74, 0.459]]
].map(([ticker, name, sector, industry, template, currentPrice, scores, metrics]) => {
  const [growth, quality, cashFlow, valuation, risk, sustainability] = scores;
  const [revenueGrowth, forwardPE, fcfYield, grossMargins, operatingMargins] = metrics;
  return {
    ticker,
    name,
    sector,
    industry,
    template,
    currentPrice,
    totalScore: scores.reduce((sum, item) => sum + item, 0),
    growth,
    quality,
    cashFlow,
    valuation,
    risk,
    sustainability,
    reasons: {
      growth: `Revenue growth ${pct(revenueGrowth)}; score calibrated against the ${template} template.`,
      quality: `Gross margin ${pct(grossMargins)}, operating margin ${pct(operatingMargins)}.`,
      cashFlow: `FCF yield ${pct(fcfYield)}; cash conversion requires filing review before action.`,
      valuation: `Forward P/E ${num(forwardPE)}; valuation score balances growth and FCF support.`,
      risk: "Balance sheet, leverage, regulation, and cycle exposure scored as first-pass risk proxies.",
      sustainability: `Template ${template}; margin profile and growth used as moat proxies.`
    },
    metrics: { revenueGrowth, forwardPE, fcfYield, grossMargins, operatingMargins }
  };
});

function asNumber(value) {
  if (value == null) return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "object" && value.raw != null) return asNumber(value.raw);
  return null;
}

function asText(value, fallback = "") {
  if (value == null) return fallback;
  if (typeof value === "object") return value.fmt || value.longFmt || value.raw || fallback;
  return String(value);
}

function pct(value) {
  return value == null ? "n/a" : `${(value * 100).toFixed(1)}%`;
}

function num(value) {
  return value == null ? "n/a" : value.toFixed(1);
}

function money(value) {
  if (value == null) return "n/a";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  return value.toFixed(0);
}

function clamp(score) {
  return Math.max(0, Math.min(5, score));
}

function classifyTemplate(sector, industry) {
  const text = `${sector} ${industry}`.toLowerCase();
  if (text.includes("reit")) return "REITs";
  if (text.includes("bank")) return "Banks";
  if (text.includes("credit services") || text.includes("payment")) return "Payment networks / financial infrastructure";
  if (text.includes("insurance")) return "Insurance";
  if (text.includes("biotechnology") || text.includes("biotech")) return "Biotech / drug development";
  if (text.includes("utilities")) return "Utilities";
  if (text.includes("energy") || text.includes("oil") || text.includes("gas")) return "Energy / oil and gas";
  if (text.includes("semiconductor")) return "Semiconductors / chip design";
  if (text.includes("software")) return "SaaS / enterprise software";
  if (text.includes("internet content") || text.includes("internet retail") || text.includes("cloud")) return "AI / cloud / platform technology";
  if (text.includes("retail") || text.includes("e-commerce")) return "Retail / e-commerce";
  if (text.includes("consumer defensive") || text.includes("household") || text.includes("beverages")) return "Consumer brands / staples";
  if (text.includes("industrial") || text.includes("manufacturing") || text.includes("equipment")) return "Industrials / manufacturing";
  if (sector === "Technology") return "AI / cloud / platform technology";
  return "General quality/value";
}

function growthScore(template, revenueGrowth, earningsGrowth) {
  const growth = revenueGrowth ?? earningsGrowth;
  if (growth == null) return [2, "Growth data unavailable; defaulted to neutral-low."];
  const conservative = ["Consumer brands / staples", "Utilities", "Banks", "Insurance", "REITs"].includes(template);
  const thresholds = conservative
    ? [0.1, 0.06, 0.03, 0]
    : template === "Payment networks / financial infrastructure"
      ? [0.15, 0.08, 0.04, 0]
      : template === "Energy / oil and gas"
        ? [0.12, 0.06, 0.02, -0.05]
        : [0.3, 0.15, 0.07, 0];
  const score = growth >= thresholds[0] ? 5 : growth >= thresholds[1] ? 4 : growth >= thresholds[2] ? 3 : growth >= thresholds[3] ? 2 : 1;
  return [score, `Revenue growth ${pct(revenueGrowth)}; earnings growth ${pct(earningsGrowth)}.`];
}

function qualityScore(template, grossMargin, operatingMargin, roe) {
  let score = 0;
  if (template === "Banks") {
    score += roe && roe > 0.12 ? 3 : roe && roe > 0.08 ? 2 : 1;
  } else {
    if (grossMargin != null) score += grossMargin >= 0.7 ? 2 : grossMargin >= 0.4 ? 1 : 0;
    if (operatingMargin != null) score += operatingMargin >= 0.25 ? 2 : operatingMargin >= 0.1 ? 1 : 0;
    if (roe != null) score += roe >= 0.15 ? 1 : 0;
  }
  return [clamp(score), `Gross margin ${pct(grossMargin)}, operating margin ${pct(operatingMargin)}, ROE ${pct(roe)}.`];
}

function cashFlowScore(fcf, operatingCashflow, marketCap, revenue) {
  const fcfYield = fcf != null && marketCap ? fcf / marketCap : null;
  const fcfMargin = fcf != null && revenue ? fcf / revenue : null;
  const conversion = fcf != null && operatingCashflow ? fcf / operatingCashflow : null;
  let score = fcf != null && fcf < 0 ? 1 : 2;
  if (fcfMargin != null) {
    score = fcfMargin >= 0.2 ? 5 : fcfMargin >= 0.1 ? 4 : fcfMargin >= 0.03 ? 3 : fcfMargin < 0 ? 1 : score;
  }
  if (fcfYield != null && fcfYield >= 0.05) score = Math.max(score, 4);
  return [score, `FCF yield ${pct(fcfYield)}, FCF margin ${pct(fcfMargin)}, FCF/OCF ${pct(conversion)}.`];
}

function valuationScore(template, forwardPE, peg, evEbitda, fcf, marketCap, revenueGrowth) {
  const fcfYield = fcf != null && marketCap ? fcf / marketCap : null;
  let score = 2;
  if (["Banks", "Insurance"].includes(template)) {
    score = forwardPE && forwardPE < 12 ? 4 : forwardPE && forwardPE < 18 ? 3 : 2;
  } else if (template === "Energy / oil and gas") {
    score = fcfYield && fcfYield > 0.08 ? 5 : evEbitda && evEbitda < 8 ? 4 : 3;
  } else {
    if (forwardPE != null) {
      score = forwardPE < 18 ? 5 : forwardPE < 28 ? 4 : forwardPE < 45 ? 3 : forwardPE < 70 ? 2 : 1;
    }
    if (peg != null && peg < 1.2) score = Math.min(5, score + 1);
    if (revenueGrowth != null && revenueGrowth > 0.3 && forwardPE && forwardPE < 45) score = Math.max(score, 4);
    if (fcfYield != null && fcfYield > 0.05) score = Math.max(score, 4);
    if (evEbitda != null && evEbitda > 60) score = Math.min(score, 2);
  }
  return [clamp(score), `Forward P/E ${num(forwardPE)}, PEG ${num(peg)}, EV/EBITDA ${num(evEbitda)}, FCF yield ${pct(fcfYield)}.`];
}

function riskScore(totalCash, totalDebt, ebitda, debtToEquity) {
  const netDebtToEbitda = totalCash != null && totalDebt != null && ebitda ? (totalDebt - totalCash) / ebitda : null;
  let score = 3;
  if (netDebtToEbitda != null) {
    score = netDebtToEbitda < 0 ? 5 : netDebtToEbitda < 1.5 ? 4 : netDebtToEbitda < 3 ? 3 : netDebtToEbitda < 5 ? 2 : 1;
  } else if (debtToEquity != null) {
    score = debtToEquity < 50 ? 4 : debtToEquity < 150 ? 3 : 2;
  }
  return [score, `Cash ${money(totalCash)}, debt ${money(totalDebt)}, net debt/EBITDA ${num(netDebtToEbitda)}.`];
}

function sustainabilityScore(template, grossMargin, operatingMargin, revenueGrowth, roe) {
  let score = 3;
  if (["AI / cloud / platform technology", "SaaS / enterprise software", "Semiconductors / chip design"].includes(template)) score += 1;
  if (grossMargin != null && grossMargin >= 0.7) score += 1;
  if (operatingMargin != null && operatingMargin >= 0.25) score += 1;
  if (revenueGrowth != null && revenueGrowth < 0) score -= 1;
  if (roe != null && roe < 0) score -= 1;
  return [clamp(score), `Template ${template}; margin profile and growth used as moat proxies.`];
}

async function fetchTicker(ticker) {
  const modules = [
    "price",
    "summaryProfile",
    "defaultKeyStatistics",
    "financialData",
    "summaryDetail",
    "assetProfile"
  ].join(",");
  const url = `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(ticker)}?modules=${modules}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 QualityValueScreener/1.0"
    }
  });
  if (!response.ok) throw new Error(`${ticker}: Yahoo returned ${response.status}`);
  const payload = await response.json();
  const result = payload?.quoteSummary?.result?.[0];
  if (!result) throw new Error(`${ticker}: missing quoteSummary result`);

  const price = result.price || {};
  const profile = result.summaryProfile || result.assetProfile || {};
  const stats = result.defaultKeyStatistics || {};
  const financial = result.financialData || {};
  const detail = result.summaryDetail || {};
  const sector = asText(profile.sector);
  const industry = asText(profile.industry);
  const template = classifyTemplate(sector, industry);
  const metrics = {
    currentPrice: asNumber(price.regularMarketPrice),
    marketCap: asNumber(price.marketCap),
    forwardPE: asNumber(stats.forwardPE || detail.forwardPE),
    pegRatio: asNumber(stats.pegRatio),
    enterpriseToEbitda: asNumber(stats.enterpriseToEbitda),
    profitMargins: asNumber(financial.profitMargins),
    operatingMargins: asNumber(financial.operatingMargins),
    grossMargins: asNumber(financial.grossMargins),
    revenueGrowth: asNumber(financial.revenueGrowth),
    earningsGrowth: asNumber(financial.earningsGrowth),
    returnOnEquity: asNumber(financial.returnOnEquity),
    freeCashflow: asNumber(financial.freeCashflow),
    operatingCashflow: asNumber(financial.operatingCashflow),
    totalRevenue: asNumber(financial.totalRevenue),
    totalCash: asNumber(financial.totalCash),
    totalDebt: asNumber(financial.totalDebt),
    ebitda: asNumber(financial.ebitda),
    debtToEquity: asNumber(financial.debtToEquity)
  };

  const reasons = {};
  const [growth, growthReason] = growthScore(template, metrics.revenueGrowth, metrics.earningsGrowth);
  const [quality, qualityReason] = qualityScore(template, metrics.grossMargins, metrics.operatingMargins, metrics.returnOnEquity);
  const [cashFlow, cashFlowReason] = cashFlowScore(metrics.freeCashflow, metrics.operatingCashflow, metrics.marketCap, metrics.totalRevenue);
  const [valuation, valuationReason] = valuationScore(template, metrics.forwardPE, metrics.pegRatio, metrics.enterpriseToEbitda, metrics.freeCashflow, metrics.marketCap, metrics.revenueGrowth);
  const [risk, riskReason] = riskScore(metrics.totalCash, metrics.totalDebt, metrics.ebitda, metrics.debtToEquity);
  const [sustainability, sustainabilityReason] = sustainabilityScore(template, metrics.grossMargins, metrics.operatingMargins, metrics.revenueGrowth, metrics.returnOnEquity);
  reasons.growth = growthReason;
  reasons.quality = qualityReason;
  reasons.cashFlow = cashFlowReason;
  reasons.valuation = valuationReason;
  reasons.risk = riskReason;
  reasons.sustainability = sustainabilityReason;

  return {
    ticker: ticker.toUpperCase(),
    name: asText(price.shortName || price.longName, ticker.toUpperCase()),
    sector,
    industry,
    template,
    currentPrice: metrics.currentPrice,
    totalScore: DIMENSIONS.reduce((sum, dim) => sum + { growth, quality, cashFlow, valuation, risk, sustainability }[dim], 0),
    growth,
    quality,
    cashFlow,
    valuation,
    risk,
    sustainability,
    reasons,
    metrics
  };
}

export default async function handler(req, res) {
  const tickers = String(req.query?.tickers || "")
    .split(",")
    .map((ticker) => ticker.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 30);
  const list = tickers.length ? tickers : DEFAULT_TICKERS;
  try {
    const latestPrices = await Promise.all(
      list.map(async (ticker) => {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1d`;
        const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 QualityValueScreener/1.0" } });
        if (!response.ok) return [ticker, null];
        const payload = await response.json();
        const price = payload?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
        return [ticker, typeof price === "number" ? price : null];
      })
    );
    const priceMap = new Map(latestPrices);
    const universe = tickers.length
      ? list.map((ticker) => BASE_SCORES.find((item) => item.ticker === ticker) || {
          ticker,
          name: ticker,
          sector: "Public market",
          industry: "Unclassified",
          template: "General quality/value",
          currentPrice: null,
          totalScore: 0,
          growth: 0,
          quality: 0,
          cashFlow: 0,
          valuation: 0,
          risk: 0,
          sustainability: 0,
          reasons: {
            growth: "Only price refresh is available for custom tickers in this public demo.",
            quality: "Run the full stock screener skill locally for complete financial scoring.",
            cashFlow: "Run the full stock screener skill locally for complete financial scoring.",
            valuation: "Run the full stock screener skill locally for complete financial scoring.",
            risk: "Run the full stock screener skill locally for complete financial scoring.",
            sustainability: "Run the full stock screener skill locally for complete financial scoring."
          },
          metrics: {}
        })
      : BASE_SCORES;
    const scores = universe.map((item) => ({
      ...item,
      currentPrice: priceMap.get(item.ticker) ?? item.currentPrice
    }));
    scores.sort((a, b) => b.totalScore - a.totalScore);
    res.setHeader("Cache-Control", "s-maxage=604800, stale-while-revalidate=86400");
    res.status(200).json({
      generatedAt: new Date().toISOString(),
      cadence: "weekly",
      source: "Yahoo Finance public chart endpoint for weekly price refresh; local scorecard for first-pass research",
      featuredTickers: ["MSFT", "NVDA", "V", "GOOGL", "UNH"],
      scores
    });
  } catch (error) {
    res.status(502).json({
      error: error instanceof Error ? error.message : "Failed to refresh stock data",
      generatedAt: new Date().toISOString()
    });
  }
}
