import test from "node:test";
import assert from "node:assert/strict";

import { resolveSnapshotScores } from "../src/compareData.ts";

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
