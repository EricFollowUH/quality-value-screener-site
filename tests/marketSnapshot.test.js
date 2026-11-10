import test from "node:test";
import assert from "node:assert/strict";

import { queryMarketSnapshot, resolveMarketSnapshotUrl, selectCompatibleSnapshot } from "../server/lib/marketSnapshot.js";

const snapshot = {
  validation:{passed:true},
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
snapshot.scores.forEach(stock=>stock.rankEligible=true);

test("old weekly model cannot overwrite the deployed v2 snapshot", () => {
  const bundled = { ...snapshot, modelVersion: "2.0.0", generatedAt: "2026-11-09T18:22:36Z" };
  assert.equal(selectCompatibleSnapshot(snapshot, bundled), bundled);
  const newer = { ...bundled, generatedAt: "2026-11-16T12:00:00Z" };
  assert.equal(selectCompatibleSnapshot(newer, bundled), newer);
  const older = { ...bundled, generatedAt: "2026-11-01T12:00:00Z" };
  assert.equal(selectCompatibleSnapshot(older, bundled), bundled);
});

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
