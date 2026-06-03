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
  "LLY",
  "AVGO",
  "JPM",
  "MA",
  "ORCL",
  "AMD",
  "NOW",
  "PLTR",
  "COST",
  "HD",
  "NKE",
  "XOM",
  "NEE",
  "AMT"
];

const FEATURED_TICKERS = ["MSFT", "NVDA", "V", "GOOGL", "UNH"];
const SEC_USER_AGENT = process.env.SEC_USER_AGENT || "quality-value-screener/1.0 contact@example.com";

const INDUSTRY_UNIVERSES = {
  "saas": ["MSFT", "CRM", "ADBE", "NOW", "ORCL", "WDAY", "INTU", "SNOW", "DDOG", "ZS", "NET", "TEAM"],
  "software": ["MSFT", "CRM", "ADBE", "NOW", "ORCL", "WDAY", "INTU", "SNOW", "DDOG", "ZS", "NET", "TEAM"],
  "cloud": ["MSFT", "GOOGL", "AMZN", "ORCL", "NOW", "CRM", "SNOW", "DDOG", "NET", "MDB", "PLTR", "ADBE"],
  "ai": ["NVDA", "MSFT", "GOOGL", "META", "AVGO", "AMD", "PLTR", "ORCL", "AMZN", "ADBE", "CRM", "NOW"],
  "semiconductor": ["NVDA", "AVGO", "AMD", "QCOM", "TXN", "ADI", "MU", "INTC", "LRCX", "KLAC", "AMAT", "TSM"],
  "semiconductors": ["NVDA", "AVGO", "AMD", "QCOM", "TXN", "ADI", "MU", "INTC", "LRCX", "KLAC", "AMAT", "TSM"],
  "chip": ["NVDA", "AVGO", "AMD", "QCOM", "TXN", "ADI", "MU", "INTC", "LRCX", "KLAC", "AMAT", "TSM"],
  "chips": ["NVDA", "AVGO", "AMD", "QCOM", "TXN", "ADI", "MU", "INTC", "LRCX", "KLAC", "AMAT", "TSM"],
  "energy": ["XOM", "CVX", "COP", "EOG", "SLB", "MPC", "PSX", "VLO", "OXY", "HAL", "KMI", "WMB"],
  "oil": ["XOM", "CVX", "COP", "EOG", "SLB", "MPC", "PSX", "VLO", "OXY", "HAL", "KMI", "WMB"],
  "gas": ["XOM", "CVX", "COP", "EOG", "SLB", "MPC", "PSX", "VLO", "OXY", "HAL", "KMI", "WMB"],
  "bank": ["JPM", "BAC", "WFC", "C", "GS", "MS", "USB", "PNC", "TFC", "BK", "STT", "SCHW"],
  "banks": ["JPM", "BAC", "WFC", "C", "GS", "MS", "USB", "PNC", "TFC", "BK", "STT", "SCHW"],
  "financial": ["JPM", "BAC", "V", "MA", "AXP", "GS", "MS", "BLK", "SCHW", "SPGI", "ICE", "CME"],
  "payment": ["V", "MA", "AXP", "PYPL", "FI", "FIS", "GPN", "COF", "DFS", "SQ"],
  "insurance": ["BRK.B", "PGR", "CB", "TRV", "AIG", "MET", "PRU", "AFL", "ALL", "HIG"],
  "reit": ["AMT", "PLD", "EQIX", "O", "PSA", "WELL", "SPG", "DLR", "CCI", "VICI"],
  "reits": ["AMT", "PLD", "EQIX", "O", "PSA", "WELL", "SPG", "DLR", "CCI", "VICI"],
  "healthcare": ["UNH", "LLY", "JNJ", "ABBV", "MRK", "TMO", "DHR", "ABT", "ISRG", "SYK", "AMGN", "GILD"],
  "biotech": ["AMGN", "GILD", "REGN", "VRTX", "BIIB", "MRNA", "BMRN", "ILMN", "INCY", "ALNY"],
  "retail": ["AMZN", "COST", "HD", "WMT", "TGT", "LOW", "TJX", "NKE", "SBUX", "MCD"],
  "consumer": ["COST", "WMT", "PG", "KO", "PEP", "MCD", "NKE", "SBUX", "HD", "LOW"],
  "industrial": ["CAT", "DE", "HON", "GE", "RTX", "UNP", "UPS", "ETN", "PH", "EMR"],
  "utility": ["NEE", "SO", "DUK", "AEP", "EXC", "SRE", "D", "PEG", "XEL", "ED"],
  "utilities": ["NEE", "SO", "DUK", "AEP", "EXC", "SRE", "D", "PEG", "XEL", "ED"]
};

const METADATA = {
  ADBE: ["Technology", "Software - Application"],
  AMD: ["Technology", "Semiconductors"],
  AMT: ["Real Estate", "REIT - Specialty"],
  AMZN: ["Consumer Cyclical", "Internet Retail"],
  AVGO: ["Technology", "Semiconductors"],
  COST: ["Consumer Defensive", "Discount Stores"],
  CRM: ["Technology", "Software - Application"],
  GOOGL: ["Communication Services", "Internet Content & Information"],
  HD: ["Consumer Cyclical", "Home Improvement Retail"],
  JPM: ["Financial Services", "Banks - Diversified"],
  LLY: ["Healthcare", "Drug Manufacturers - General"],
  MA: ["Financial Services", "Credit Services"],
  META: ["Communication Services", "Internet Content & Information"],
  MSFT: ["Technology", "Software - Infrastructure"],
  NEE: ["Utilities", "Utilities - Regulated Electric"],
  NKE: ["Consumer Cyclical", "Footwear & Accessories"],
  NOW: ["Technology", "Software - Application"],
  NVDA: ["Technology", "Semiconductors"],
  ORCL: ["Technology", "Software - Infrastructure"],
  PLTR: ["Technology", "Software - Infrastructure"],
  UNH: ["Healthcare", "Healthcare Plans"],
  V: ["Financial Services", "Credit Services"],
  XOM: ["Energy", "Oil & Gas Integrated"]
};

const FACT_KEYS = {
  revenue: [
    "RevenueFromContractWithCustomerExcludingAssessedTax",
    "Revenues",
    "SalesRevenueNet"
  ],
  grossProfit: ["GrossProfit"],
  operatingIncome: ["OperatingIncomeLoss"],
  netIncome: ["NetIncomeLoss"],
  operatingCashflow: ["NetCashProvidedByUsedInOperatingActivities"],
  capex: [
    "PaymentsToAcquirePropertyPlantAndEquipment",
    "PaymentsToAcquireProductiveAssets",
    "CapitalExpenditures"
  ],
  assets: ["Assets"],
  liabilities: ["Liabilities"],
  equity: ["StockholdersEquity", "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest"],
  cash: ["CashAndCashEquivalentsAtCarryingValue", "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents"],
  longTermDebt: ["LongTermDebtAndFinanceLeaseObligationsNoncurrent", "LongTermDebtNoncurrent"],
  currentDebt: ["LongTermDebtAndFinanceLeaseObligationsCurrent", "ShortTermBorrowings"],
  shares: ["EntityCommonStockSharesOutstanding"],
  dilutedShares: ["WeightedAverageNumberOfDilutedSharesOutstanding", "WeightedAverageNumberOfSharesOutstandingBasic"]
};

function pct(value) {
  return value == null || Number.isNaN(value) ? "n/a" : `${(value * 100).toFixed(1)}%`;
}

function num(value) {
  return value == null || Number.isNaN(value) ? "n/a" : value.toFixed(1);
}

function money(value) {
  if (value == null || Number.isNaN(value)) return "n/a";
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(2)}T`;
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  return value.toFixed(0);
}

function clamp(score) {
  return Math.max(0, Math.min(5, Math.round(score)));
}

function latestByEnd(items) {
  return [...items].sort((a, b) => {
    const endCompare = String(b.end || "").localeCompare(String(a.end || ""));
    if (endCompare !== 0) return endCompare;
    return String(b.filed || "").localeCompare(String(a.filed || ""));
  })[0] || null;
}

function isRecentFact(item, maxDays = 540) {
  if (!item?.end) return false;
  const end = new Date(item.end).getTime();
  if (Number.isNaN(end)) return false;
  return Date.now() - end <= maxDays * 24 * 60 * 60 * 1000;
}

function usableFacts(facts, taxonomy, key) {
  const fact = facts?.[taxonomy]?.[key];
  if (!fact?.units) return [];
  const units = Object.values(fact.units).flat();
  return units
    .filter((item) => typeof item.val === "number" && item.end)
    .map((item) => ({ ...item, key }));
}

function allFacts(companyFacts, keys, taxonomy = "us-gaap") {
  return keys.flatMap((key) => usableFacts(companyFacts.facts, taxonomy, key));
}

function periodFacts(companyFacts, keys, form, minMonths, maxMonths) {
  return allFacts(companyFacts, keys)
    .filter((item) => item.form === form && item.start && item.end)
    .map((item) => {
      const start = new Date(item.start);
      const end = new Date(item.end);
      return { ...item, months: (end.getTime() - start.getTime()) / 1000 / 60 / 60 / 24 / 30.4 };
    })
    .filter((item) => item.months >= minMonths && item.months <= maxMonths);
}

function trailingFourQuarters(companyFacts, keys) {
  const quarters = periodFacts(companyFacts, keys, "10-Q", 2, 4.5);
  const unique = new Map();
  for (const item of quarters) {
    const existing = unique.get(item.end);
    if (!existing || String(item.filed || "") > String(existing.filed || "")) unique.set(item.end, item);
  }
  const latest = [...unique.values()]
    .sort((a, b) => String(b.end).localeCompare(String(a.end)))
    .slice(0, 4);
  if (latest.length < 3) return null;
  return {
    value: latest.reduce((sum, item) => sum + item.val, 0),
    end: latest[0].end,
    sourceKeys: [...new Set(latest.map((item) => item.key))]
  };
}

function annualFacts(companyFacts, keys) {
  return periodFacts(companyFacts, keys, "10-K", 10, 14)
    .sort((a, b) => String(b.end).localeCompare(String(a.end)));
}

function latestInstant(companyFacts, keys, taxonomy = "us-gaap") {
  const items = allFacts(companyFacts, keys, taxonomy).filter((item) => !item.start);
  return latestByEnd(items);
}

async function fetchJson(url, headers = {}) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response.json();
}

let tickerIndexPromise;

async function getTickerIndex() {
  if (!tickerIndexPromise) {
    tickerIndexPromise = fetchJson("https://www.sec.gov/files/company_tickers_exchange.json", {
      "User-Agent": SEC_USER_AGENT
    }).then((payload) => {
      const fields = payload.fields || [];
      const tickerIdx = fields.indexOf("ticker");
      const cikIdx = fields.indexOf("cik");
      const nameIdx = fields.indexOf("name");
      const exchangeIdx = fields.indexOf("exchange");
      const map = new Map();
      for (const row of payload.data || []) {
        const ticker = String(row[tickerIdx] || "").toUpperCase();
        if (!ticker) continue;
        map.set(ticker, {
          ticker,
          cik: String(row[cikIdx]).padStart(10, "0"),
          name: row[nameIdx] || ticker,
          exchange: exchangeIdx >= 0 ? row[exchangeIdx] || "" : ""
        });
      }
      return map;
    });
  }
  return tickerIndexPromise;
}

async function fetchYahooPrice(ticker) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=1d&interval=1d`;
  const payload = await fetchJson(url, { "User-Agent": "Mozilla/5.0 QualityValueScreener/1.0" });
  const meta = payload?.chart?.result?.[0]?.meta || {};
  return {
    currentPrice: typeof meta.regularMarketPrice === "number" ? meta.regularMarketPrice : null,
    exchangeName: meta.fullExchangeName || meta.exchangeName || "",
    currency: meta.currency || "USD"
  };
}

async function fetchSecCompany(entry) {
  const [facts, submissions] = await Promise.all([
    fetchJson(`https://data.sec.gov/api/xbrl/companyfacts/CIK${entry.cik}.json`, {
      "User-Agent": SEC_USER_AGENT
    }),
    fetchJson(`https://data.sec.gov/submissions/CIK${entry.cik}.json`, {
      "User-Agent": SEC_USER_AGENT
    }).catch(() => ({}))
  ]);
  return { facts, submissions };
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
  if (growth == null) return [2, "SEC facts did not provide enough comparable periods; defaulted to neutral-low."];
  const conservative = ["Consumer brands / staples", "Utilities", "Banks", "Insurance", "REITs"].includes(template);
  const thresholds = conservative
    ? [0.1, 0.06, 0.03, 0]
    : template === "Payment networks / financial infrastructure"
      ? [0.15, 0.08, 0.04, 0]
      : template === "Energy / oil and gas"
        ? [0.12, 0.06, 0.02, -0.05]
        : [0.3, 0.15, 0.07, 0];
  const score = growth >= thresholds[0] ? 5 : growth >= thresholds[1] ? 4 : growth >= thresholds[2] ? 3 : growth >= thresholds[3] ? 2 : 1;
  return [score, `Revenue growth ${pct(revenueGrowth)}; earnings growth ${pct(earningsGrowth)} from latest comparable SEC periods.`];
}

function qualityScore(template, grossMargin, operatingMargin, roe) {
  let score = 0;
  if (template === "Banks") {
    score += roe != null && roe > 0.12 ? 3 : roe != null && roe > 0.08 ? 2 : 1;
  } else {
    if (grossMargin != null) score += grossMargin >= 0.7 ? 2 : grossMargin >= 0.4 ? 1 : 0;
    if (operatingMargin != null) score += operatingMargin >= 0.25 ? 2 : operatingMargin >= 0.1 ? 1 : 0;
    if (roe != null) score += roe >= 0.15 ? 1 : 0;
  }
  return [clamp(score), `Gross margin ${pct(grossMargin)}, operating margin ${pct(operatingMargin)}, ROE ${pct(roe)} from SEC facts.`];
}

function cashFlowScore(fcf, operatingCashflow, marketCap, revenue) {
  const fcfYield = fcf != null && marketCap ? fcf / marketCap : null;
  const fcfMargin = fcf != null && revenue ? fcf / revenue : null;
  const conversion = fcf != null && operatingCashflow ? fcf / operatingCashflow : null;
  let score = fcf != null && fcf < 0 ? 1 : 2;
  if (fcfMargin != null) score = fcfMargin >= 0.2 ? 5 : fcfMargin >= 0.1 ? 4 : fcfMargin >= 0.03 ? 3 : fcfMargin < 0 ? 1 : score;
  if (fcfYield != null && fcfYield >= 0.05) score = Math.max(score, 4);
  return [score, `FCF yield ${pct(fcfYield)}, FCF margin ${pct(fcfMargin)}, FCF/OCF ${pct(conversion)}.`];
}

function valuationScore(template, trailingPE, fcf, marketCap, revenueGrowth) {
  const fcfYield = fcf != null && marketCap ? fcf / marketCap : null;
  let score = 2;
  if (marketCap == null) {
    return [2, "Valuation is neutral because reliable live market cap/share-count data was unavailable from public sources."];
  }
  if (["Banks", "Insurance"].includes(template)) {
    score = trailingPE != null && trailingPE < 12 ? 4 : trailingPE != null && trailingPE < 18 ? 3 : 2;
  } else if (template === "Energy / oil and gas") {
    score = fcfYield != null && fcfYield > 0.08 ? 5 : trailingPE != null && trailingPE < 14 ? 4 : 3;
  } else if (trailingPE != null && trailingPE > 0) {
    score = trailingPE < 18 ? 5 : trailingPE < 28 ? 4 : trailingPE < 45 ? 3 : trailingPE < 70 ? 2 : 1;
    if (revenueGrowth != null && revenueGrowth > 0.3 && trailingPE < 45) score = Math.max(score, 4);
    if (fcfYield != null && fcfYield > 0.05) score = Math.max(score, 4);
  }
  return [clamp(score), `Trailing P/E ${num(trailingPE)}, FCF yield ${pct(fcfYield)}; computed from latest public price and SEC facts.`];
}

function riskScore(totalCash, totalDebt, ebitda, debtToEquity) {
  const netDebtToEbitda = totalCash != null && totalDebt != null && ebitda ? (totalDebt - totalCash) / ebitda : null;
  let score = 3;
  if (netDebtToEbitda != null) score = netDebtToEbitda < 0 ? 5 : netDebtToEbitda < 1.5 ? 4 : netDebtToEbitda < 3 ? 3 : netDebtToEbitda < 5 ? 2 : 1;
  else if (debtToEquity != null) score = debtToEquity < 0.5 ? 4 : debtToEquity < 1.5 ? 3 : 2;
  return [score, `Cash ${money(totalCash)}, debt ${money(totalDebt)}, net debt/EBITDA ${num(netDebtToEbitda)}, debt/equity ${num(debtToEquity)}.`];
}

function sustainabilityScore(template, grossMargin, operatingMargin, revenueGrowth, roe) {
  let score = 3;
  if (["AI / cloud / platform technology", "SaaS / enterprise software", "Semiconductors / chip design"].includes(template)) score += 1;
  if (grossMargin != null && grossMargin >= 0.7) score += 1;
  if (operatingMargin != null && operatingMargin >= 0.25) score += 1;
  if (revenueGrowth != null && revenueGrowth < 0) score -= 1;
  if (roe != null && roe < 0) score -= 1;
  return [clamp(score), `Template ${template}; SEC margin profile and growth are used as first-pass moat proxies.`];
}

function extractMetrics(companyFacts, price) {
  const revenueTtm = trailingFourQuarters(companyFacts, FACT_KEYS.revenue);
  const netIncomeTtm = trailingFourQuarters(companyFacts, FACT_KEYS.netIncome);
  const grossProfitTtm = trailingFourQuarters(companyFacts, FACT_KEYS.grossProfit);
  const operatingIncomeTtm = trailingFourQuarters(companyFacts, FACT_KEYS.operatingIncome);
  const operatingCashflowTtm = trailingFourQuarters(companyFacts, FACT_KEYS.operatingCashflow);
  const capexTtm = trailingFourQuarters(companyFacts, FACT_KEYS.capex);

  const revenueAnnual = annualFacts(companyFacts, FACT_KEYS.revenue);
  const netIncomeAnnual = annualFacts(companyFacts, FACT_KEYS.netIncome);
  const latestRevenue = revenueTtm?.value ?? revenueAnnual[0]?.val ?? null;
  const latestNetIncome = netIncomeTtm?.value ?? netIncomeAnnual[0]?.val ?? null;
  const previousRevenue = revenueAnnual[1]?.val ?? null;
  const previousNetIncome = netIncomeAnnual[1]?.val ?? null;

  const cash = latestInstant(companyFacts, FACT_KEYS.cash)?.val ?? null;
  const longDebt = latestInstant(companyFacts, FACT_KEYS.longTermDebt)?.val ?? 0;
  const currentDebt = latestInstant(companyFacts, FACT_KEYS.currentDebt)?.val ?? 0;
  const equity = latestInstant(companyFacts, FACT_KEYS.equity)?.val ?? null;
  const dilutedSharesFact = latestByEnd(allFacts(companyFacts, FACT_KEYS.dilutedShares));
  const instantSharesFact = latestInstant(companyFacts, FACT_KEYS.shares, "dei");
  const dilutedShares = isRecentFact(dilutedSharesFact) ? dilutedSharesFact.val : null;
  const instantShares = isRecentFact(instantSharesFact) ? instantSharesFact.val : null;
  const shares = dilutedShares ?? instantShares ?? null;

  const totalDebt = longDebt + currentDebt || null;
  const marketCap = price.currentPrice != null && shares ? price.currentPrice * shares : null;
  const fcf = operatingCashflowTtm?.value != null
    ? operatingCashflowTtm.value - Math.abs(capexTtm?.value ?? 0)
    : null;
  const ebitdaProxy = operatingIncomeTtm?.value ?? latestNetIncome;

  return {
    currentPrice: price.currentPrice,
    marketCap,
    trailingPE: marketCap && latestNetIncome ? marketCap / latestNetIncome : null,
    revenueGrowth: latestRevenue != null && previousRevenue ? (latestRevenue - previousRevenue) / Math.abs(previousRevenue) : null,
    earningsGrowth: latestNetIncome != null && previousNetIncome ? (latestNetIncome - previousNetIncome) / Math.abs(previousNetIncome) : null,
    grossMargins: grossProfitTtm?.value != null && latestRevenue ? grossProfitTtm.value / latestRevenue : null,
    operatingMargins: operatingIncomeTtm?.value != null && latestRevenue ? operatingIncomeTtm.value / latestRevenue : null,
    returnOnEquity: latestNetIncome != null && equity ? latestNetIncome / equity : null,
    freeCashflow: fcf,
    operatingCashflow: operatingCashflowTtm?.value ?? null,
    totalRevenue: latestRevenue,
    totalCash: cash,
    totalDebt,
    ebitda: ebitdaProxy,
    debtToEquity: totalDebt != null && equity ? totalDebt / equity : null,
    sharesOutstanding: shares,
    latestFiscalEnd: revenueTtm?.end ?? revenueAnnual[0]?.end ?? null
  };
}

function scoreCompany({ ticker, name, sector, industry, template, metrics }) {
  const reasons = {};
  const [growth, growthReason] = growthScore(template, metrics.revenueGrowth, metrics.earningsGrowth);
  const [quality, qualityReason] = qualityScore(template, metrics.grossMargins, metrics.operatingMargins, metrics.returnOnEquity);
  const [cashFlow, cashFlowReason] = cashFlowScore(metrics.freeCashflow, metrics.operatingCashflow, metrics.marketCap, metrics.totalRevenue);
  const [valuation, valuationReason] = valuationScore(template, metrics.trailingPE, metrics.freeCashflow, metrics.marketCap, metrics.revenueGrowth);
  const [risk, riskReason] = riskScore(metrics.totalCash, metrics.totalDebt, metrics.ebitda, metrics.debtToEquity);
  const [sustainability, sustainabilityReason] = sustainabilityScore(template, metrics.grossMargins, metrics.operatingMargins, metrics.revenueGrowth, metrics.returnOnEquity);

  reasons.growth = growthReason;
  reasons.quality = qualityReason;
  reasons.cashFlow = cashFlowReason;
  reasons.valuation = valuationReason;
  reasons.risk = riskReason;
  reasons.sustainability = sustainabilityReason;

  return {
    ticker,
    name,
    sector,
    industry,
    template,
    currentPrice: metrics.currentPrice,
    totalScore: growth + quality + cashFlow + valuation + risk + sustainability,
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

function emptyScore(ticker, message) {
  return {
    ticker,
    name: ticker,
    sector: "Data unavailable",
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
      growth: message,
      quality: message,
      cashFlow: message,
      valuation: message,
      risk: message,
      sustainability: message
    },
    metrics: {}
  };
}

export async function screenTickers(tickers = DEFAULT_TICKERS) {
  const tickerIndex = await getTickerIndex();
  const scores = await Promise.all(
    tickers.map(async (rawTicker) => {
      const ticker = String(rawTicker).trim().toUpperCase();
      const entry = tickerIndex.get(ticker);
      if (!entry) return emptyScore(ticker, "Ticker was not found in the SEC company ticker index.");
      try {
        const [price, sec] = await Promise.all([fetchYahooPrice(ticker), fetchSecCompany(entry)]);
        const fallbackMeta = METADATA[ticker] || ["Public market", sec.submissions?.sicDescription || "SEC filer"];
        const sector = fallbackMeta[0];
        const industry = fallbackMeta[1] || sec.submissions?.sicDescription || "";
        const template = classifyTemplate(sector, industry);
        const metrics = extractMetrics(sec.facts, price);
        return scoreCompany({
          ticker,
          name: sec.facts.entityName || sec.submissions?.name || entry.name || ticker,
          sector,
          industry,
          template,
          metrics
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Live data refresh failed.";
        return emptyScore(ticker, message);
      }
    })
  );

  return scores.sort((a, b) => b.totalScore - a.totalScore);
}

export function resolveSearchUniverse(query) {
  const key = String(query || "").trim().toLowerCase();
  if (!key) return null;
  return INDUSTRY_UNIVERSES[key] || null;
}

function companyMatchScore(entry, query, tokens) {
  const ticker = entry.ticker.toLowerCase();
  const name = String(entry.name || "").toLowerCase();
  const haystack = `${ticker} ${name}`;
  if (ticker === query) return 100;
  if (ticker.startsWith(query)) return 92;
  if (name.startsWith(query)) return 84;
  if (ticker.includes(query)) return 76;
  if (name.includes(query)) return 68;
  if (tokens.every((token) => haystack.includes(token))) return 58;
  const words = name.split(/[^a-z0-9]+/).filter((word) => word.length >= 3);
  if (tokens.every((token) => words.some((word) => isCloseWord(token, word)))) return 48;
  return 0;
}

function isCloseWord(query, word) {
  if (query.length < 4 || Math.abs(query.length - word.length) > 1) return false;
  if (word.includes(query) || query.includes(word)) return true;
  let edits = 0;
  let i = 0;
  let j = 0;
  while (i < query.length && j < word.length) {
    if (query[i] === word[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (query.length > word.length) i += 1;
    else if (query.length < word.length) j += 1;
    else {
      i += 1;
      j += 1;
    }
  }
  return edits + (query.length - i) + (word.length - j) <= 1;
}

export async function searchCompanies(query, limit = 8) {
  const normalized = String(query || "").trim().toLowerCase();
  if (normalized.length < 2) return [];
  const tokens = normalized.split(/\s+/).filter(Boolean);
  const tickerIndex = await getTickerIndex();
  return [...tickerIndex.values()]
    .map((entry) => ({
      ...entry,
      score: companyMatchScore(entry, normalized, tokens)
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.name.length - b.name.length;
    })
    .slice(0, limit)
    .map(({ ticker, name, exchange, score }) => ({ ticker, name, exchange, score }));
}

export { DEFAULT_TICKERS, FEATURED_TICKERS };
