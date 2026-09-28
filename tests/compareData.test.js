import test from "node:test";
import assert from "node:assert/strict";

import { mergeSnapshotQuote, resolveSnapshotScores } from "../src/compareData.ts";

const currentScores = [
  { ticker: "NVDA", totalScore: 28, metrics: { forwardPE: 14.2 } }
];

const fullMarketScores = [
  ...currentScores,
  {
    ticker: "JD",
    totalScore: 18,
    metrics: {
      forwardPE: 6.4,
      trailingPE: 18,
      revenueGrowth: 0.18,
      totalRevenue: 187_197_000_000
    }
  }
];

test("uses the complete market snapshot before requesting a sparse live score", () => {
  const result = resolveSnapshotScores(["JD"], currentScores, fullMarketScores);

  assert.deepEqual(result.found.map((stock) => stock.ticker), ["JD"]);
  assert.equal(result.found[0].metrics.forwardPE, 6.4);
  assert.deepEqual(result.missing, []);
});

test("reports only tickers absent from both snapshots as missing", () => {
  const result = resolveSnapshotScores(["JD", "UNKNOWN"], currentScores, fullMarketScores);

  assert.deepEqual(result.found.map((stock) => stock.ticker), ["JD"]);
  assert.deepEqual(result.missing, ["UNKNOWN"]);
});

test("refreshes quote fields without erasing complete snapshot fundamentals", () => {
  const snapshotStock = fullMarketScores.find((stock) => stock.ticker === "JD");
  const sparseLiveStock = {
    ticker: "JD",
    currentPrice: 26.51,
    quoteAsOf: "2026-09-25T20:00:00Z",
    totalScore: 13,
    metrics: {
      previousClose: 26.75,
      percentChange: -0.009,
      forwardPE: null,
      revenueGrowth: null
    }
  };

  const result = mergeSnapshotQuote(snapshotStock, sparseLiveStock);

  assert.equal(result.currentPrice, 26.51);
  assert.equal(result.quoteAsOf, "2026-09-25T20:00:00Z");
  assert.equal(result.metrics.percentChange, -0.009);
  assert.equal(result.metrics.forwardPE, 6.4);
  assert.equal(result.metrics.revenueGrowth, 0.18);
  assert.equal(result.totalScore, 18);
});
