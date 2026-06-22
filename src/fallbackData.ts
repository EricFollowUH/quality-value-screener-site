import type { Snapshot, StockScore } from "./types";

const reason = (template: string, growth: string, quality: string, cash: string, valuation: string, risk: string) => ({
  growth,
  quality,
  cashFlow: cash,
  valuation,
  risk,
  sustainability: `Template ${template}; margin profile and growth used as moat proxies.`
});

const stock = (
  ticker: string,
  name: string,
  sector: string,
  industry: string,
  template: string,
  currentPrice: number,
  scores: [number, number, number, number, number, number],
  reasons: ReturnType<typeof reason>,
  metrics: Record<string, number | null>
): StockScore => {
  const [growth, quality, cashFlow, valuation, risk, sustainability] = scores;
  return {
    ticker,
    name,
    sector,
    industry,
    template,
    currentPrice,
    quoteAsOf: "2026-06-03T15:19:34Z",
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
};

export const fallbackSnapshot: Snapshot = {
  generatedAt: "2026-06-03T15:19:34Z",
  cadence: "weekly",
  source: "Local weekly fallback generated with yfinance and the quality-value-stock-screener model.",
  featuredTickers: ["MSFT", "NVDA", "V", "GOOGL", "UNH"],
  scores: [
    stock(
      "NVDA",
      "NVIDIA Corporation",
      "Technology",
      "Semiconductors",
      "Semiconductors / chip design",
      216.55,
      [5, 5, 4, 5, 5, 5],
      reason(
        "Semiconductors / chip design",
        "Revenue growth 85.2%; earnings growth 214.5%.",
        "Gross margin 74.1%, operating margin 65.6%, ROE 114.3%.",
        "FCF yield 0.9%, FCF margin 18.3%, FCF/OCF 36.9%.",
        "Forward P/E 17.1, PEG 0.7, EV/EBITDA 32.3, FCF yield 0.9%.",
        "Cash 53.2B, debt 12.8B, net debt/EBITDA -0.2."
      ),
      { revenueGrowth: 0.852, forwardPE: 17.145, fcfYield: 0.009, grossMargins: 0.741, operatingMargins: 0.656 }
    ),
    stock(
      "META",
      "Meta Platforms, Inc.",
      "Communication Services",
      "Internet Content & Information",
      "AI / cloud / platform technology",
      617.64,
      [5, 5, 4, 5, 4, 5],
      reason(
        "AI / cloud / platform technology",
        "Revenue growth 33.1%; earnings growth 62.4%.",
        "Gross margin 81.9%, operating margin 40.6%, ROE 32.9%.",
        "FCF yield 1.6%, FCF margin 11.9%, FCF/OCF 20.6%.",
        "Forward P/E 17.0, PEG 0.9, EV/EBITDA 13.9, FCF yield 1.6%.",
        "Cash 81.2B, debt 86.8B, net debt/EBITDA 0.1."
      ),
      { revenueGrowth: 0.331, forwardPE: 17.045, fcfYield: 0.016, grossMargins: 0.819, operatingMargins: 0.406 }
    ),
    stock(
      "V",
      "Visa Inc.",
      "Financial Services",
      "Credit Services",
      "Payment networks / financial infrastructure",
      310.16,
      [5, 5, 5, 4, 4, 5],
      reason(
        "Payment networks / financial infrastructure",
        "Revenue growth 17.1%; earnings growth 35.5%.",
        "Gross margin 97.8%, operating margin 67.3%, ROE 60.3%.",
        "FCF yield 3.5%, FCF margin 48.4%, FCF/OCF 91.6%.",
        "Forward P/E 20.9, PEG 1.5, EV/EBITDA 20.2, FCF yield 3.5%.",
        "Cash 13.9B, debt 24.0B, net debt/EBITDA 0.3."
      ),
      { revenueGrowth: 0.171, forwardPE: 20.873, fcfYield: 0.035, grossMargins: 0.978, operatingMargins: 0.673 }
    ),
    stock(
      "ADBE",
      "Adobe Inc.",
      "Technology",
      "Software - Application",
      "SaaS / enterprise software",
      255.81,
      [3, 5, 5, 5, 5, 5],
      reason(
        "SaaS / enterprise software",
        "Revenue growth 12.0%; earnings growth 11.1%.",
        "Gross margin 89.4%, operating margin 38.8%, ROE 58.8%.",
        "FCF yield 9.0%, FCF margin 38.1%, FCF/OCF 88.7%.",
        "Forward P/E 9.7, PEG 0.7, EV/EBITDA 11.1, FCF yield 9.0%.",
        "Cash 6.9B, debt 6.7B, net debt/EBITDA -0.0."
      ),
      { revenueGrowth: 0.12, forwardPE: 9.678, fcfYield: 0.09, grossMargins: 0.894, operatingMargins: 0.388 }
    ),
    stock(
      "MSFT",
      "Microsoft Corporation",
      "Technology",
      "Software - Infrastructure",
      "SaaS / enterprise software",
      427.17,
      [4, 4, 4, 4, 4, 5],
      reason(
        "SaaS / enterprise software",
        "Revenue growth 18.3%; earnings growth 23.4%.",
        "Gross margin 68.3%, operating margin 46.3%, ROE 34.0%.",
        "FCF yield 1.2%, FCF margin 11.6%, FCF/OCF 21.8%.",
        "Forward P/E 22.0, PEG 1.4, EV/EBITDA 18.0, FCF yield 1.2%.",
        "Cash 78.2B, debt 125.4B, net debt/EBITDA 0.3."
      ),
      { revenueGrowth: 0.183, forwardPE: 22.048, fcfYield: 0.012, grossMargins: 0.683, operatingMargins: 0.463 }
    ),
    stock(
      "GOOGL",
      "Alphabet Inc.",
      "Communication Services",
      "Internet Content & Information",
      "AI / cloud / platform technology",
      359.36,
      [4, 4, 3, 4, 5, 5],
      reason(
        "AI / cloud / platform technology",
        "Revenue growth 21.8%; earnings growth 82.0%.",
        "Gross margin 60.4%, operating margin 36.1%, ROE 38.9%.",
        "FCF yield 0.6%, FCF margin 6.6%, FCF/OCF 16.0%.",
        "Forward P/E 24.9, PEG 1.5, EV/EBITDA 27.0, FCF yield 0.6%.",
        "Cash 126.8B, debt 95.9B, net debt/EBITDA -0.2."
      ),
      { revenueGrowth: 0.218, forwardPE: 24.857, fcfYield: 0.006, grossMargins: 0.604, operatingMargins: 0.361 }
    ),
    stock(
      "UNH",
      "UnitedHealth Group Incorporated",
      "Healthcare",
      "Healthcare Plans",
      "General quality/value",
      382.34,
      [2, 0, 4, 4, 3, 3],
      reason(
        "General quality/value",
        "Revenue growth 2.0%; earnings growth 0.7%.",
        "Gross margin 18.8%, operating margin 8.0%, ROE 12.2%.",
        "FCF yield 5.1%, FCF margin 3.9%, FCF/OCF 76.4%.",
        "Forward P/E 18.3, PEG 1.3, EV/EBITDA 18.5, FCF yield 5.1%.",
        "Cash 31.2B, debt 77.9B, net debt/EBITDA 2.2."
      ),
      { revenueGrowth: 0.02, forwardPE: 18.272, fcfYield: 0.051, grossMargins: 0.188, operatingMargins: 0.08 }
    ),
    stock(
      "CRM",
      "Salesforce, Inc.",
      "Technology",
      "Software - Application",
      "SaaS / enterprise software",
      191.85,
      [3, 4, 5, 5, 3, 5],
      reason(
        "SaaS / enterprise software",
        "Revenue growth 13.3%; earnings growth 52.2%.",
        "Gross margin 77.6%, operating margin 21.8%, ROE 16.9%.",
        "FCF yield 10.5%, FCF margin 38.6%, FCF/OCF 108.8%.",
        "Forward P/E 12.4, PEG 0.9, EV/EBITDA 15.1, FCF yield 10.5%.",
        "Cash 11.8B, debt 42.5B, net debt/EBITDA 2.4."
      ),
      { revenueGrowth: 0.133, forwardPE: 12.374, fcfYield: 0.105, grossMargins: 0.776, operatingMargins: 0.218 }
    ),
    stock(
      "LLY",
      "Eli Lilly and Company",
      "Healthcare",
      "Drug Manufacturers - General",
      "General quality/value",
      1087.17,
      [5, 5, 4, 4, 4, 5],
      reason(
        "General quality/value",
        "Revenue growth 55.5%; earnings growth 169.9%.",
        "Gross margin 82.8%, operating margin 49.4%, ROE 107.5%.",
        "FCF yield 0.9%, FCF margin 12.7%, FCF/OCF 44.7%.",
        "Forward P/E 24.3, PEG 1.4, EV/EBITDA 27.3, FCF yield 0.9%.",
        "Cash 5.3B, debt 43.4B, net debt/EBITDA 1.1."
      ),
      { revenueGrowth: 0.555, forwardPE: 24.308, fcfYield: 0.009, grossMargins: 0.828, operatingMargins: 0.494 }
    ),
    stock(
      "AMT",
      "American Tower Corporation",
      "Real Estate",
      "REIT - Specialty",
      "REITs",
      187.36,
      [4, 5, 5, 4, 1, 5],
      reason(
        "REITs",
        "Revenue growth 6.8%; earnings growth 76.9%.",
        "Gross margin 74.0%, operating margin 45.9%, ROE 30.0%.",
        "FCF yield 5.3%, FCF margin 42.6%, FCF/OCF 82.8%.",
        "Forward P/E 27.1, PEG 2.0, EV/EBITDA 19.5, FCF yield 5.3%.",
        "Cash 1.6B, debt 45.1B, net debt/EBITDA 6.2."
      ),
      { revenueGrowth: 0.068, forwardPE: 27.124, fcfYield: 0.053, grossMargins: 0.74, operatingMargins: 0.459 }
    )
  ]
};
