export type ScoreDimension =
  | "growth"
  | "quality"
  | "cashFlow"
  | "valuation"
  | "risk"
  | "sustainability";

export type StockScore = {
  ticker: string;
  error?: string;
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
  rankEligible?: boolean;
  dataQuality?: {status: string; complete: boolean; checkedAt: string | null; periodEnd: string | null; dimensions: Record<ScoreDimension, string>};
  metricSources?: Record<string, {url: string; end: string; filed?: string; basis?: string}>;
  totalScore: number | null;
  growth: number | null;
  quality: number | null;
  cashFlow: number | null;
  valuation: number | null;
  risk: number | null;
  sustainability: number | null;
  reasons: Record<ScoreDimension, string>;
  metrics: Record<string, number | null>;
};

export type Snapshot = {
  generatedAt: string;
  cadence: "weekly" | "live" | "daily";
  modelVersion?: string;
  validation?: {passed: boolean};
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
    coveredCount?: number;
    rankEligibleCount?: number;
    incompleteCount?: number;
  };
  scores: StockScore[];
};
