const A_SHARE_UNIVERSE = [
  ["600519", "贵州茅台", "消费", "白酒", "白酒 / 高端消费", 0.12, 0.14, 0.91, 0.53, 0.30, 0.32, 0.95, 0.03, 0.20, 5, 174000000000, 150000000000, 3000000000, 88000000000],
  ["000858", "五粮液", "消费", "白酒", "白酒 / 高端消费", 0.08, 0.11, 0.76, 0.36, 0.23, 0.24, 0.88, 0.04, 0.23, 4, 83000000000, 110000000000, 12000000000, 36000000000],
  ["300750", "宁德时代", "制造", "动力电池", "新能源 / 电池", 0.16, 0.18, 0.25, 0.12, 0.22, 0.08, 0.72, 0.01, 0.58, 5, 400000000000, 260000000000, 170000000000, 65000000000],
  ["002594", "比亚迪", "制造", "新能源汽车", "新能源 / 电池", 0.25, 0.22, 0.21, 0.06, 0.21, 0.04, 0.55, 0.01, 0.70, 5, 700000000000, 120000000000, 260000000000, 62000000000],
  ["000333", "美的集团", "消费", "家电", "先进制造 / 消费制造", 0.09, 0.14, 0.27, 0.10, 0.23, 0.08, 0.80, 0.05, 0.63, 4, 370000000000, 92000000000, 120000000000, 52000000000],
  ["600036", "招商银行", "金融", "股份制银行", "银行", 0.03, 0.02, null, 0.42, 0.15, 0.08, 0.88, 0.05, 0.92, 4, 365000000000, 1000000000000, 0, 180000000000],
  ["601318", "中国平安", "金融", "保险", "保险", 0.04, 0.11, null, 0.11, 0.12, 0.07, 0.75, 0.05, 0.88, 4, 1050000000000, 920000000000, 0, 160000000000],
  ["600276", "恒瑞医药", "医药", "创新药", "医药医疗", 0.13, 0.18, 0.84, 0.23, 0.14, 0.13, 0.70, 0.01, 0.16, 4, 23000000000, 33000000000, 3000000000, 8000000000],
  ["300760", "迈瑞医疗", "医药", "医疗器械", "医药医疗", 0.11, 0.13, 0.65, 0.31, 0.27, 0.24, 0.82, 0.03, 0.23, 5, 37000000000, 29000000000, 3500000000, 14000000000],
  ["600309", "万华化学", "材料", "化工", "周期资源 / 化工", 0.08, 0.10, 0.20, 0.11, 0.18, 0.09, 0.65, 0.02, 0.56, 4, 180000000000, 42000000000, 105000000000, 39000000000],
  ["601012", "隆基绿能", "制造", "光伏", "新能源 / 电池", -0.18, -0.35, 0.13, -0.03, -0.04, -0.08, 0.25, 0.00, 0.55, 3, 125000000000, 57000000000, 62000000000, 7000000000],
  ["002415", "海康威视", "科技", "安防设备", "先进制造 / 消费制造", 0.05, 0.07, 0.44, 0.16, 0.17, 0.12, 0.73, 0.03, 0.40, 4, 90000000000, 53000000000, 33000000000, 21000000000],
  ["600887", "伊利股份", "消费", "乳制品", "白酒 / 高端消费", 0.04, 0.08, 0.34, 0.08, 0.18, 0.07, 0.78, 0.05, 0.52, 4, 126000000000, 32000000000, 54000000000, 18000000000],
  ["601899", "紫金矿业", "材料", "有色金属", "周期资源 / 化工", 0.18, 0.22, 0.18, 0.11, 0.24, 0.08, 0.66, 0.02, 0.58, 4, 300000000000, 35000000000, 145000000000, 72000000000],
  ["600031", "三一重工", "工业", "工程机械", "工程机械 / 工业制造", 0.10, 0.18, 0.28, 0.09, 0.12, 0.07, 0.62, 0.02, 0.54, 4, 78000000000, 25000000000, 47000000000, 11000000000],
  ["600900", "长江电力", "公用事业", "水电", "电力 / 公用事业", 0.05, 0.08, 0.57, 0.44, 0.16, 0.22, 0.85, 0.03, 0.55, 5, 80000000000, 31000000000, 300000000000, 52000000000],
  ["002475", "立讯精密", "科技", "消费电子", "先进制造 / 消费制造", 0.15, 0.18, 0.13, 0.05, 0.17, 0.05, 0.58, 0.01, 0.60, 4, 230000000000, 46000000000, 82000000000, 22000000000],
  ["002371", "北方华创", "科技", "半导体设备", "半导体 / 硬科技", 0.30, 0.28, 0.43, 0.20, 0.16, 0.12, 0.70, 0.01, 0.38, 5, 26000000000, 12000000000, 9000000000, 6000000000],
  ["688111", "金山办公", "科技", "办公软件", "软件 / 云服务", 0.15, 0.18, 0.86, 0.31, 0.13, 0.19, 0.76, 0.01, 0.18, 5, 4600000000, 12000000000, 600000000, 1800000000],
  ["688981", "中芯国际", "科技", "晶圆代工", "半导体 / 硬科技", 0.12, 0.16, 0.22, 0.08, 0.07, 0.02, 0.40, 0.00, 0.28, 4, 45000000000, 95000000000, 18000000000, 9000000000],
  ["300059", "东方财富", "金融", "互联网券商", "券商 / 金融服务", 0.08, 0.10, 0.58, 0.42, 0.13, 0.21, 0.80, 0.01, 0.48, 4, 11000000000, 76000000000, 22000000000, 6100000000]
].map(([ticker, name, sector, industry, template, revenueGrowth, earningsGrowth, grossMargins, operatingMargins, returnOnEquity, fcfMargin, ocfToProfit, dividendYield, debtToAsset, moatStrength, totalRevenue, totalCash, totalDebt, ebitda]) => ({
  ticker,
  name,
  sector,
  industry,
  template,
  metrics: {
    revenueGrowth,
    earningsGrowth,
    grossMargins,
    operatingMargins,
    returnOnEquity,
    fcfMargin,
    ocfToProfit,
    dividendYield,
    debtToAsset,
    moatStrength,
    totalRevenue,
    totalCash,
    totalDebt,
    ebitda
  }
}));

const A_SHARE_FEATURED_TICKERS = ["600519", "300750", "000333", "600036", "002594"];

const SEARCH_KEYWORDS = {
  "baijiu": "白酒",
  "消费": "白酒",
  "白酒": "白酒",
  "新能源": "新能源",
  "电池": "新能源",
  "ev": "新能源",
  "银行": "银行",
  "保险": "保险",
  "医药": "医药",
  "医疗": "医药",
  "半导体": "半导体",
  "芯片": "半导体",
  "制造": "制造",
  "公用": "公用事业",
  "电力": "公用事业",
  "券商": "券商",
  "金融": "金融"
};

function clamp(score) {
  return Math.max(0, Math.min(5, Math.round(score)));
}

function secid(ticker) {
  return ticker.startsWith("6") ? `1.${ticker}` : `0.${ticker}`;
}

function parseEastmoneyNumber(value, divisor = 1) {
  if (value == null || value === "-" || Number.isNaN(Number(value))) return null;
  return Number(value) / divisor;
}

async function fetchEastmoneyQuote(ticker) {
  const fields = "f57,f58,f43,f60,f116,f117,f162,f167,f170";
  const url = `https://push2.eastmoney.com/api/qt/stock/get?secid=${secid(ticker)}&fields=${fields}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 quality-value-screener/1.0",
      "Accept": "application/json"
    }
  });
  if (!response.ok) throw new Error(`quote unavailable for ${ticker}`);
  const payload = await response.json();
  const data = payload?.data || {};
  return {
    currentPrice: parseEastmoneyNumber(data.f43, 100),
    previousClose: parseEastmoneyNumber(data.f60, 100),
    marketCap: parseEastmoneyNumber(data.f116),
    trailingPE: parseEastmoneyNumber(data.f162, 100),
    priceToBook: parseEastmoneyNumber(data.f167, 100),
    percentChange: parseEastmoneyNumber(data.f170, 100)
  };
}

function sinaSymbol(ticker) {
  return `${ticker.startsWith("6") ? "sh" : "sz"}${ticker}`;
}

async function fetchSinaQuote(ticker) {
  const url = `https://hq.sinajs.cn/list=${sinaSymbol(ticker)}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 quality-value-screener/1.0",
      "Referer": "https://finance.sina.com.cn/"
    }
  });
  if (!response.ok) throw new Error(`sina quote unavailable for ${ticker}`);
  const text = await response.text();
  const match = text.match(/="([^"]*)"/);
  const parts = match?.[1]?.split(",") || [];
  const previousClose = Number(parts[2]);
  const currentPrice = Number(parts[3]);
  return {
    currentPrice: Number.isFinite(currentPrice) ? currentPrice : null,
    previousClose: Number.isFinite(previousClose) ? previousClose : null,
    marketCap: null,
    trailingPE: null,
    priceToBook: null,
    percentChange: Number.isFinite(currentPrice) && Number.isFinite(previousClose) && previousClose
      ? (currentPrice - previousClose) / previousClose
      : null
  };
}

async function fetchQuote(ticker) {
  try {
    return await fetchEastmoneyQuote(ticker);
  } catch {
    return fetchSinaQuote(ticker);
  }
}

function growthScore(template, revenueGrowth, earningsGrowth) {
  const conservative = ["白酒 / 高端消费", "银行", "保险", "电力 / 公用事业"].includes(template);
  const strong = conservative ? 0.10 : 0.18;
  const good = conservative ? 0.05 : 0.10;
  let score = 2;
  if (revenueGrowth >= strong && earningsGrowth >= strong) score = 5;
  else if (revenueGrowth >= good && earningsGrowth >= good) score = 4;
  else if (revenueGrowth >= 0 && earningsGrowth >= 0) score = 3;
  else if (revenueGrowth < -0.15 || earningsGrowth < -0.25) score = 1;
  return clamp(score);
}

function qualityScore(template, metrics) {
  const { grossMargins, operatingMargins, returnOnEquity } = metrics;
  if (template === "银行" || template === "保险") {
    return clamp((returnOnEquity >= 0.15 ? 4 : returnOnEquity >= 0.10 ? 3 : 2) + (metrics.debtToAsset < 0.95 ? 1 : 0));
  }
  let score = 1;
  if ((grossMargins ?? 0) >= 0.55) score += 1;
  if ((operatingMargins ?? 0) >= 0.18) score += 1;
  if ((returnOnEquity ?? 0) >= 0.15) score += 1;
  if ((returnOnEquity ?? 0) >= 0.25 || (grossMargins ?? 0) >= 0.75) score += 1;
  return clamp(score);
}

function cashFlowScore(metrics) {
  const { fcfMargin, ocfToProfit, dividendYield } = metrics;
  let score = 1;
  if ((fcfMargin ?? 0) >= 0.05) score += 1;
  if ((fcfMargin ?? 0) >= 0.12) score += 1;
  if ((ocfToProfit ?? 0) >= 0.7) score += 1;
  if ((dividendYield ?? 0) >= 0.03) score += 1;
  return clamp(score);
}

function valuationScore(template, pe, pb, dividendYield, returnOnEquity) {
  if (template === "银行" || template === "保险") {
    let score = 2;
    if ((pb ?? 99) <= 0.9 && (returnOnEquity ?? 0) >= 0.10) score = 4;
    if ((pb ?? 99) <= 0.7 && (returnOnEquity ?? 0) >= 0.12) score = 5;
    if ((pb ?? 99) >= 1.5) score = 2;
    return clamp(score + ((dividendYield ?? 0) >= 0.04 ? 1 : 0));
  }
  let score = 1;
  if ((pe ?? 99) <= 45) score += 1;
  if ((pe ?? 99) <= 28) score += 1;
  if ((pe ?? 99) <= 18) score += 1;
  if ((pe ?? 99) <= 12 || (dividendYield ?? 0) >= 0.04) score += 1;
  if (["新能源 / 电池", "半导体 / 硬科技", "软件 / 云服务"].includes(template) && (pe ?? 99) <= 55) score = Math.max(score, 3);
  return clamp(score);
}

function riskScore(metrics) {
  const { debtToAsset, totalCash, totalDebt, ebitda } = metrics;
  const netDebtToEbitda = ebitda ? (totalDebt - totalCash) / ebitda : null;
  let score = 5;
  if ((debtToAsset ?? 1) > 0.65) score -= 1;
  if ((debtToAsset ?? 1) > 0.78) score -= 1;
  if (netDebtToEbitda != null && netDebtToEbitda > 2.5) score -= 1;
  if (netDebtToEbitda != null && netDebtToEbitda > 5) score -= 1;
  return clamp(score);
}

function sustainabilityScore(template, metrics) {
  let score = metrics.moatStrength || 3;
  if ((metrics.returnOnEquity ?? 0) >= 0.18) score += 0.5;
  if ((metrics.grossMargins ?? 0) >= 0.6) score += 0.5;
  if (["白酒 / 高端消费", "软件 / 云服务", "半导体 / 硬科技", "电力 / 公用事业"].includes(template)) score += 0.5;
  return clamp(score);
}

function reason(tone, text) {
  return `${tone}。${text}`;
}

function scoreCompany(item, quote = {}) {
  const metrics = { ...item.metrics };
  metrics.marketCap = quote.marketCap || metrics.marketCap || null;
  metrics.trailingPE = quote.trailingPE || metrics.trailingPE || null;
  metrics.priceToBook = quote.priceToBook || metrics.priceToBook || null;
  metrics.freeCashflow = metrics.fcfMargin != null && metrics.totalRevenue ? metrics.fcfMargin * metrics.totalRevenue : null;
  metrics.operatingCashflow = metrics.ocfToProfit && metrics.freeCashflow ? metrics.freeCashflow / metrics.ocfToProfit : null;

  const growth = growthScore(item.template, metrics.revenueGrowth, metrics.earningsGrowth);
  const quality = qualityScore(item.template, metrics);
  const cashFlow = cashFlowScore(metrics);
  const valuation = valuationScore(item.template, metrics.trailingPE, metrics.priceToBook, metrics.dividendYield, metrics.returnOnEquity);
  const risk = riskScore(metrics);
  const sustainability = sustainabilityScore(item.template, metrics);

  return {
    ticker: item.ticker,
    name: item.name,
    sector: item.sector,
    industry: item.industry,
    template: item.template,
    currentPrice: quote.currentPrice || null,
    totalScore: growth + quality + cashFlow + valuation + risk + sustainability,
    growth,
    quality,
    cashFlow,
    valuation,
    risk,
    sustainability,
    reasons: {
      growth: reason(growth, `营收增速 ${(metrics.revenueGrowth * 100).toFixed(1)}%，利润增速 ${(metrics.earningsGrowth * 100).toFixed(1)}%。`),
      quality: reason(quality, `ROE ${metrics.returnOnEquity != null ? (metrics.returnOnEquity * 100).toFixed(1) + "%" : "暂无"}，经营利润率 ${metrics.operatingMargins != null ? (metrics.operatingMargins * 100).toFixed(1) + "%" : "暂无"}。`),
      cashFlow: reason(cashFlow, `FCF 利润率 ${metrics.fcfMargin != null ? (metrics.fcfMargin * 100).toFixed(1) + "%" : "暂无"}，现金转化 ${metrics.ocfToProfit != null ? (metrics.ocfToProfit * 100).toFixed(1) + "%" : "暂无"}。`),
      valuation: reason(valuation, `P/E ${metrics.trailingPE != null ? metrics.trailingPE.toFixed(1) : "暂无"}，P/B ${metrics.priceToBook != null ? metrics.priceToBook.toFixed(1) : "暂无"}。`),
      risk: reason(risk, `资产负债率 ${metrics.debtToAsset != null ? (metrics.debtToAsset * 100).toFixed(1) + "%" : "暂无"}。`),
      sustainability: reason(sustainability, `按 ${item.template} 模板评估行业地位、品牌/技术壁垒和盈利可持续性。`)
    },
    metrics
  };
}

function searchUniverse(query, limit = 8) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return [];
  const mapped = SEARCH_KEYWORDS[q] || q;
  return A_SHARE_UNIVERSE
    .map((item) => {
      let score = 0;
      if (item.ticker === q) score += 100;
      if (item.ticker.includes(q)) score += 60;
      if (item.name.includes(query)) score += 80;
      if (item.template.includes(mapped) || item.industry.includes(mapped) || item.sector.includes(mapped)) score += 45;
      return { ...item, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => ({ ticker: item.ticker, name: item.name, exchange: item.ticker.startsWith("6") ? "上交所" : "深交所", score: item.score }));
}

async function scoreTickers(tickers) {
  const normalized = Array.from(new Set(tickers.map((ticker) => String(ticker).trim()).filter(Boolean)));
  const selected = normalized.length
    ? normalized.map((ticker) => A_SHARE_UNIVERSE.find((item) => item.ticker === ticker)).filter(Boolean)
    : A_SHARE_UNIVERSE.filter((item) => A_SHARE_FEATURED_TICKERS.includes(item.ticker));

  const scores = await Promise.all(
    selected.map(async (item) => {
      try {
        return scoreCompany(item, await fetchQuote(item.ticker));
      } catch {
        return scoreCompany(item, {});
      }
    })
  );
  return scores.sort((a, b) => b.totalScore - a.totalScore);
}

async function buildAShareSnapshot({ tickers = [], q = "" } = {}) {
  let targetTickers = tickers;
  if (q && !targetTickers.length) {
    const matches = searchUniverse(q, 12);
    targetTickers = matches.map((item) => item.ticker);
  }
  const scores = await scoreTickers(targetTickers);
  return {
    generatedAt: new Date().toISOString(),
    cadence: "live",
    source: "A股服务端实时行情：东方财富公开报价 + 本地周度财务快照。",
    featuredTickers: A_SHARE_FEATURED_TICKERS,
    scores
  };
}

export {
  A_SHARE_UNIVERSE,
  A_SHARE_FEATURED_TICKERS,
  buildAShareSnapshot,
  searchUniverse
};
