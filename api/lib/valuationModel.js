const GROWTH_TEMPLATES = new Set([
  "AI / cloud / platform technology",
  "SaaS / enterprise software",
  "Semiconductors / chip design"
]);

const STABLE_TEMPLATES = new Set([
  "Consumer brands / staples",
  "Payment networks / financial infrastructure",
  "Utilities"
]);

function finitePositive(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

function clampScore(value) {
  return Math.max(1, Math.min(5, Math.round(value)));
}

function lowerIsBetter(value, bands) {
  const multiple = finitePositive(value);
  if (multiple == null) return null;
  if (multiple <= bands[0]) return 5;
  if (multiple <= bands[1]) return 4;
  if (multiple <= bands[2]) return 3;
  if (multiple <= bands[3]) return 2;
  return 1;
}

function fcfYieldScore(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value >= 0.08) return 5;
  if (value >= 0.05) return 4;
  if (value >= 0.03) return 3;
  if (value >= 0.015) return 2;
  if (value >= 0) return 1;
  return 1;
}

function weightedScore(parts, fallback = 3) {
  const available = parts.filter((part) => part.score != null);
  if (available.length === 0) return fallback;
  const totalWeight = available.reduce((sum, part) => sum + part.weight, 0);
  const weighted = available.reduce((sum, part) => sum + part.score * part.weight, 0);
  return clampScore(weighted / totalWeight);
}

function peBands(template) {
  if (GROWTH_TEMPLATES.has(template)) {
    return { forward: [18, 25, 35, 50], trailing: [20, 30, 45, 65] };
  }
  if (STABLE_TEMPLATES.has(template)) {
    return { forward: [13, 18, 25, 35], trailing: [15, 22, 30, 42] };
  }
  return { forward: [14, 20, 28, 40], trailing: [16, 24, 34, 50] };
}

function priceToBookScore(template, value) {
  const bands = template === "Banks" ? [0.9, 1.3, 1.8, 2.5] : [1.2, 2, 3, 4];
  return lowerIsBetter(value, bands);
}

function describeMethod(forwardPE, trailingPE, fcfYield, priceToBook) {
  if (finitePositive(forwardPE) != null) return "forward-pe-primary";
  if ([trailingPE, fcfYield, priceToBook].some((value) => typeof value === "number" && Number.isFinite(value))) {
    return "ttm-fcf-fallback";
  }
  return "insufficient-data";
}

export function scoreValuation({
  template = "General quality/value",
  forwardPE = null,
  trailingPE = null,
  fcfYield = null,
  priceToBook = null,
  marketCap = null
}) {
  if (template === "REITs") {
    return {
      score: 3,
      method: "pffo-required",
      reason: "REIT 需要 P/FFO 或 AFFO 收益率；缺少该数据时估值保持中性。"
    };
  }

  if (typeof forwardPE === "number" && Number.isFinite(forwardPE) && forwardPE <= 0) {
    return {
      score: 2,
      method: "forward-loss-warning",
      reason: "一致预期显示未来盈利为负，不能把低 TTM P/E 视为低估，估值按弱处理。"
    };
  }

  const method = describeMethod(forwardPE, trailingPE, fcfYield, priceToBook);
  if (method === "insufficient-data" || marketCap == null) {
    return {
      score: 3,
      method: "insufficient-data",
      reason: "缺少可核验的 FPE、TTM P/E、FCF 收益率或市值数据，估值保持中性。"
    };
  }

  if (template === "Banks" || template === "Insurance") {
    const score = weightedScore([
      { score: lowerIsBetter(forwardPE, [10, 12, 15, 18]), weight: 0.5 },
      { score: lowerIsBetter(trailingPE, [10, 15, 18, 21]), weight: 0.2 },
      { score: priceToBookScore(template, priceToBook), weight: 0.3 }
    ]);
    return {
      score,
      method,
      reason: "金融股以前瞻盈利倍数为主，并用 TTM P/E 与 P/B 交叉验证。"
    };
  }

  const bands = peBands(template);
  const weights = template === "Energy / oil and gas"
    ? { forward: 0.25, trailing: 0.15, fcf: 0.6 }
    : { forward: 0.6, trailing: 0.15, fcf: 0.25 };
  const score = weightedScore([
    { score: lowerIsBetter(forwardPE, bands.forward), weight: weights.forward },
    { score: lowerIsBetter(trailingPE, bands.trailing), weight: weights.trailing },
    { score: fcfYieldScore(fcfYield), weight: weights.fcf }
  ]);

  return {
    score,
    method,
    reason: method === "forward-pe-primary"
      ? "以前瞻市盈率为主，TTM P/E 与 FCF 收益率用于交叉验证。"
      : "缺少可靠 FPE，暂按 TTM P/E 与 FCF 收益率降级评估。"
  };
}
