import test from "node:test";
import assert from "node:assert/strict";

import { scoreValuation } from "../api/lib/valuationModel.js";

test("uses forward P/E as the primary valuation signal", () => {
  const attractive = scoreValuation({
    template: "General quality/value",
    forwardPE: 16,
    trailingPE: 25,
    fcfYield: 0.04,
    marketCap: 100
  });
  const expensive = scoreValuation({
    template: "General quality/value",
    forwardPE: 45,
    trailingPE: 25,
    fcfYield: 0.04,
    marketCap: 100
  });

  assert.equal(attractive.method, "forward-pe-primary");
  assert.equal(attractive.score, 4);
  assert.equal(expensive.score, 2);
});

test("falls back to TTM P/E and FCF yield when consensus FPE is unavailable", () => {
  const result = scoreValuation({
    template: "General quality/value",
    forwardPE: null,
    trailingPE: 18,
    fcfYield: 0.06,
    marketCap: 100
  });

  assert.equal(result.method, "ttm-fcf-fallback");
  assert.equal(result.score, 4);
});

test("uses price-to-book alongside earnings multiples for banks", () => {
  const attractive = scoreValuation({
    template: "Banks",
    forwardPE: 10,
    trailingPE: 14,
    priceToBook: 0.9,
    marketCap: 100
  });
  const expensive = scoreValuation({
    template: "Banks",
    forwardPE: 20,
    trailingPE: 22,
    priceToBook: 3,
    marketCap: 100
  });

  assert.equal(attractive.score, 5);
  assert.equal(expensive.score, 1);
});

test("keeps REIT valuation neutral when P/FFO is unavailable", () => {
  const result = scoreValuation({
    template: "REITs",
    forwardPE: 11,
    trailingPE: 12,
    fcfYield: 0.1,
    marketCap: 100
  });

  assert.equal(result.method, "pffo-required");
  assert.equal(result.score, 3);
});

test("returns neutral when no auditable valuation inputs are available", () => {
  const result = scoreValuation({
    template: "General quality/value",
    forwardPE: null,
    trailingPE: null,
    fcfYield: null,
    marketCap: null
  });

  assert.equal(result.method, "insufficient-data");
  assert.equal(result.score, 3);
});

test("does not treat a negative forward P/E as missing consensus data", () => {
  const result = scoreValuation({
    template: "Biotech / drug development",
    forwardPE: -6.4,
    trailingPE: 6.2,
    fcfYield: 0.14,
    marketCap: 100
  });

  assert.equal(result.method, "forward-loss-warning");
  assert.equal(result.score, 2);
});
