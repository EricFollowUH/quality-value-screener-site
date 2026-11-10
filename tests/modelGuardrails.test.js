import test from "node:test";
import assert from "node:assert/strict";
import { applyModelGuardrails, classifyGames } from "../api/lib/modelGuardrails.js";
import { scoreCompany } from "../api/lib/liveScreener.js";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const scores = { growth: 5, quality: 5, cashFlow: 5, valuation: 5, risk: 5, sustainability: 5 };
const healthy = { marketCap: 10e9, totalRevenue: 1e9, totalDebt: 0, totalCash:1e9, operatingCashflow:220e6,grossMargins:.8,operatingMargins:.3,returnOnEquity:.2,companyFactsVerified:1,financialAgeDays:45,forecastVerified:1,netIncome: 200e6, operatingIncome: 240e6, totalEquity: 2e9, freeCashflow: 180e6, capex: 20e6, capitalizedSoftware: 0, forwardPE: 20, quarterRevenueGrowth:.2, quarterAgeDays:45 };

test("MSGM-like microcap cannot qualify through margins and cheap PE alone", () => {
  const result = applyModelGuardrails("Games / interactive entertainment", { ...healthy, marketCap: 19e6, totalRevenue: 11.3e6, netIncome: 6.84e6, operatingIncome: 3.25e6, totalEquity: 3.88e6, totalDebt: null, capitalizedSoftware: 1.1e6, freeCashflow: 3e6 }, scores);
  assert.equal(result.highQualityEligible, false);
  assert.ok(result.scores.risk <= 1);
  assert.ok(result.scores.quality <= 3);
  assert.ok(result.scores.valuation <= 3);
  assert.ok(result.scores.sustainability <= 3);
  assert.ok(result.flags.length >= 4);
});

test("missing cash investment is not treated as zero", () => {
  const result = applyModelGuardrails("SaaS / enterprise software", { ...healthy, capex: null, capitalizedSoftware: null }, scores);
  assert.equal(result.scores.cashFlow,null);
  assert.equal(result.highQualityEligible, false);
});

test("negative equity cannot earn high quality from a positive ROE", () => {
  const result = applyModelGuardrails("General quality/value", { ...healthy, totalEquity: -100, netIncome: -100, operatingIncome: -50 }, scores);
  assert.ok(result.scores.quality <= 2);
  assert.equal(result.highQualityEligible, false);
});

test("negative operating profits are not safe negative leverage", () => {
  const result = applyModelGuardrails("General quality/value", { ...healthy, operatingIncome: -1, netIncome: -2 }, scores);
  assert.ok(result.scores.risk <= 2);
});

test("gross issuance and concentration only penalize when actually supplied", () => {
  const result = applyModelGuardrails("General quality/value", { ...healthy, potentialDilution: .33, productConcentration: .78 }, scores);
  assert.equal(result.highQualityEligible, false);
  assert.ok(result.scores.risk <= 2);
  assert.ok(result.scores.sustainability <= 2);
});

test("healthy large business is not microcap penalized; moat proxy is capped", () => {
  const result = applyModelGuardrails("SaaS / enterprise software", healthy, scores);
  assert.equal(result.scores.quality, 5);
  assert.equal(result.scores.risk, 5);
  assert.equal(result.scores.sustainability, 3);
  assert.equal(result.highQualityEligible, true);
});

test("banks are not labeled low quality for absent industrial cash flow, but cannot invent a complete total", () => {
  const result = applyModelGuardrails("Banks", { ...healthy, capex: null, freeCashflow: null }, scores);
  assert.equal(result.highQualityEligible, false);
  assert.equal(result.scores.cashFlow,null);
  assert.equal(result.flags.length, 0);
});

test("game identification does not confuse GameStop with a game developer", () => {
  assert.equal(classifyGames("Technology", "Prepackaged Software", "Motorsport Games Inc."), true);
  assert.equal(classifyGames("Retail", "Specialty Retail", "GameStop Corp."), false);
});

test("Python snapshot and JS live paths apply identical policy", () => {
  const metrics = { ...healthy, marketCap: 19e6, totalRevenue: 11e6, totalDebt: null, netIncome: 6.8e6, operatingIncome: 3.2e6 };
  const py = spawnSync(process.env.PYTHON || "python3", ["-c", `import json,sys; from scripts.build_us_market_snapshot import apply_model_guardrails; p=json.load(sys.stdin); print(json.dumps(apply_model_guardrails(*p)))`], {
    input: JSON.stringify(["Games / interactive entertainment", metrics, scores]), encoding: "utf8"
  });
  assert.equal(py.status, 0, py.stderr);
  assert.deepEqual(JSON.parse(py.stdout), applyModelGuardrails("Games / interactive entertainment", metrics, scores));
});

test("live score total is the sum of guarded dimensions", () => {
  const stock = scoreCompany({ ticker: "TEST", name: "Test Games", sector: "Technology", industry: "Video Games", template: "Games / interactive entertainment", metrics: { ...healthy, marketCap: 19e6, totalRevenue: 11e6, operatingCashflow:4.073e6,freeCashflow:2.961e6,capex:12000,capitalizedSoftware:1.1e6,grossMargins: .81, operatingMargins: .28, returnOnEquity: 1.78, revenueGrowth: .3, earningsGrowth: 3.5, ebitda: 3e6 } });
  assert.equal(stock.totalScore, ["growth", "quality", "cashFlow", "valuation", "risk", "sustainability"].reduce((sum, key) => sum + stock[key], 0));
  assert.equal(stock.highQualityEligible, false);
  assert.equal(stock.risk, 1);
  assert.equal(stock.modelVersion, "2.2.0");
});

test("published local snapshot obeys the same gates for every scored company", () => {
  const snapshot = JSON.parse(readFileSync(new URL("../public/data/us-market-scores.json", import.meta.url)));
  assert.equal(snapshot.modelVersion, "2.2.0");
  for (const stock of snapshot.scores) {
    const dimensions = Object.fromEntries(Object.keys(scores).map(key => [key, stock[key]]));
    const guarded = applyModelGuardrails(stock.template, stock.metrics, dimensions);
    assert.deepEqual(guarded.scores, dimensions, stock.ticker);
    assert.deepEqual(guarded.flags, stock.reviewFlags, stock.ticker);
    assert.equal(guarded.highQualityEligible, stock.highQualityEligible, stock.ticker);
    assert.equal(stock.totalScore, Object.values(dimensions).every(Number.isFinite)?Object.values(dimensions).reduce((sum, value) => sum + value, 0):null, stock.ticker);
  }
});
