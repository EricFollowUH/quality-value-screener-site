import type { Snapshot, StockScore } from "./types";

const score = (
  ticker: string,
  name: string,
  sector: string,
  industry: string,
  template: string,
  currentPrice: number,
  dimensions: Pick<StockScore, "growth" | "quality" | "cashFlow" | "valuation" | "risk" | "sustainability">,
  metrics: StockScore["metrics"]
): StockScore => ({
  ticker,
  name,
  sector,
  industry,
  template,
  currentPrice,
  quoteAsOf: "2026-06-05T00:00:00.000Z",
  totalScore: dimensions.growth + dimensions.quality + dimensions.cashFlow + dimensions.valuation + dimensions.risk + dimensions.sustainability,
  ...dimensions,
  reasons: {
    growth: "本地 A 股财务快照，用于服务端不可用时兜底。",
    quality: "本地 A 股财务快照，用于服务端不可用时兜底。",
    cashFlow: "本地 A 股财务快照，用于服务端不可用时兜底。",
    valuation: "本地 A 股财务快照，用于服务端不可用时兜底。",
    risk: "本地 A 股财务快照，用于服务端不可用时兜底。",
    sustainability: "本地 A 股财务快照，用于服务端不可用时兜底。"
  },
  metrics
});

export const aShareFallbackSnapshot: Snapshot = {
  generatedAt: "2026-06-05T00:00:00.000Z",
  cadence: "weekly",
  source: "A股本地周度兜底快照；服务端优先使用东方财富/新浪公开行情。",
  featuredTickers: ["600519", "300750", "000333", "600036", "002594"],
  scores: [
    score("600519", "贵州茅台", "消费", "白酒", "白酒 / 高端消费", 1272.86, { growth: 4, quality: 5, cashFlow: 5, valuation: 4, risk: 5, sustainability: 5 }, {
      revenueGrowth: 0.12, earningsGrowth: 0.14, grossMargins: 0.91, operatingMargins: 0.53, returnOnEquity: 0.30,
      fcfMargin: 0.32, freeCashflow: 55680000000, operatingCashflow: 58600000000, totalRevenue: 174000000000,
      trailingPE: 14.6, priceToBook: 5.87, marketCap: 1590000000000, totalCash: 150000000000, totalDebt: 3000000000, ebitda: 88000000000
    }),
    score("300750", "宁德时代", "制造", "动力电池", "新能源 / 电池", 403.0, { growth: 4, quality: 4, cashFlow: 3, valuation: 4, risk: 3, sustainability: 5 }, {
      revenueGrowth: 0.16, earningsGrowth: 0.18, grossMargins: 0.25, operatingMargins: 0.12, returnOnEquity: 0.22,
      fcfMargin: 0.08, freeCashflow: 32000000000, operatingCashflow: 44400000000, totalRevenue: 400000000000,
      trailingPE: 22.5, priceToBook: 5.7, marketCap: 1860000000000, totalCash: 260000000000, totalDebt: 170000000000, ebitda: 65000000000
    }),
    score("000333", "美的集团", "消费", "家电", "先进制造 / 消费制造", 73.0, { growth: 4, quality: 4, cashFlow: 4, valuation: 4, risk: 4, sustainability: 4 }, {
      revenueGrowth: 0.09, earningsGrowth: 0.14, grossMargins: 0.27, operatingMargins: 0.10, returnOnEquity: 0.23,
      fcfMargin: 0.08, freeCashflow: 29600000000, operatingCashflow: 37000000000, totalRevenue: 370000000000,
      trailingPE: 15.5, priceToBook: 2.8, marketCap: 520000000000, totalCash: 92000000000, totalDebt: 120000000000, ebitda: 52000000000
    }),
    score("600036", "招商银行", "金融", "股份制银行", "银行", 39.0, { growth: 3, quality: 4, cashFlow: 4, valuation: 4, risk: 3, sustainability: 4 }, {
      revenueGrowth: 0.03, earningsGrowth: 0.02, grossMargins: null, operatingMargins: 0.42, returnOnEquity: 0.15,
      fcfMargin: 0.08, freeCashflow: 29200000000, operatingCashflow: 33200000000, totalRevenue: 365000000000,
      trailingPE: 7.0, priceToBook: 0.9, marketCap: 980000000000, totalCash: 1000000000000, totalDebt: 0, ebitda: 180000000000
    }),
    score("002594", "比亚迪", "制造", "新能源汽车", "新能源 / 电池", 260.0, { growth: 5, quality: 3, cashFlow: 2, valuation: 3, risk: 2, sustainability: 5 }, {
      revenueGrowth: 0.25, earningsGrowth: 0.22, grossMargins: 0.21, operatingMargins: 0.06, returnOnEquity: 0.21,
      fcfMargin: 0.04, freeCashflow: 28000000000, operatingCashflow: 51000000000, totalRevenue: 700000000000,
      trailingPE: 32.0, priceToBook: 5.0, marketCap: 760000000000, totalCash: 120000000000, totalDebt: 260000000000, ebitda: 62000000000
    })
  ]
};
