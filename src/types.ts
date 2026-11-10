export type ScoreDimension =
  | "growth"
  | "quality"
  | "cashFlow"
  | "valuation"
  | "risk"
  | "sustainability";

export type StockScore = {
  ticker: string;
  name: string;
  sector: string;
  industry: string;
  template: string;
  currentPrice: number | null;
  quoteAsOf?: string | null;
  modelVersion?: string;
  reviewFlags?: string[];
  highQualityEligible?: boolean;
  evidenceSources?: string[];
  totalScore: number;
  growth: number;
  quality: number;
  cashFlow: number;
  valuation: number;
  risk: number;
  sustainability: number;
  reasons: Record<ScoreDimension, string>;
  metrics: Record<string, number | null>;
};

export type Snapshot = {
  generatedAt: string;
  cadence: "weekly" | "live";
  source: string;
  featuredTickers: string[];
  coverage?: {
    scope?: string;
    listedCount?: number;
    factsCount?: number;
    pricedCount?: number;
    scoredCount?: number;
    matchedCount?: number;
    returnedCount?: number;
    excludedCount?: number;
  };
  scores: StockScore[];
};
