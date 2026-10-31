import test from "node:test";
import assert from "node:assert/strict";

import { queryMarketSnapshot, resolveMarketSnapshotUrl } from "../api/lib/marketSnapshot.js";

const snapshot = {
  generatedAt: "2026-09-23T12:00:00.000Z",
  cadence: "weekly",
  source: "test snapshot",
  coverage: { scope: "us-scoreable-market", scoredCount: 4 },
  featuredTickers: [],
  scores: [
    { ticker: "ALFA", name: "Alpha", template: "Semiconductors / chip design", totalScore: 24, growth: 5, quality: 4, cashFlow: 3, valuation: 4, risk: 4, sustainability: 4 },
    { ticker: "BETA", name: "Beta", template: "Semiconductors / chip design", totalScore: 25, growth: 3, quality: 5, cashFlow: 5, valuation: 5, risk: 4, sustainability: 3 },
    { ticker: "GAMA", name: "Gamma", template: "SaaS / enterprise software", totalScore: 26, growth: 5, quality: 4, cashFlow: 4, valuation: 5, risk: 4, sustainability: 4 },
    { ticker: "DELT", name: "Delta", template: "Semiconductors / chip design", totalScore: 20, growth: 4, quality: 3, cashFlow: 3, valuation: 3, risk: 4, sustainability: 3 }
  ]
};

test("combines industry and multiple dimension minimums", () => {
  const result = queryMarketSnapshot(snapshot, {
    template: "Semiconductors / chip design",
    minGrowth: "4",
    minValuation: "4",
    sort: "valuation"
  });

  assert.deepEqual(result.scores.map((stock) => stock.ticker), ["ALFA"]);
  assert.equal(result.coverage.matchedCount, 1);
});

test("applies every selected dimension minimum independently of sorting", () => {
  const result = queryMarketSnapshot(snapshot, {
    minGrowth: "5",
    minQuality: "4",
    minValuation: "4",
    sort: "totalScore"
  });

  assert.deepEqual(result.scores.map((stock) => stock.ticker), ["GAMA", "ALFA"]);
});

test("uses the weekly published snapshot when running on Vercel", () => {
  assert.equal(
    resolveMarketSnapshotUrl({ VERCEL_URL: "quality-value-screener-site.vercel.app" }),
    "https://ericfollowuh.github.io/quality-value-screener-site/data/us-market-scores.json"
  );
});

test("allows an explicit snapshot URL to override the weekly source", () => {
  assert.equal(
    resolveMarketSnapshotUrl({
      VERCEL_URL: "quality-value-screener-site.vercel.app",
      US_MARKET_SNAPSHOT_URL: "https://example.com/current.json"
    }),
    "https://example.com/current.json"
  );
});
