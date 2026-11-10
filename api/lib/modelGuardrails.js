import policy from "../../model-policy.json" with { type: "json" };

export function classifyGames(sector, industry, name = "") {
  return /video games|electronic gaming|interactive entertainment|motorsport games/i.test(`${sector} ${industry} ${name}`)
    || (/software/i.test(industry) && /\bgames\b/i.test(name));
}

export function applyModelGuardrails(template, metrics, rawScores) {
  const scores = { ...rawScores, sustainability: Math.min(rawScores.sustainability, 3) };
  const software = /SaaS|Games|platform technology/.test(template);
  const financial = ["Banks", "Insurance", "REITs"].includes(template);
  const healthcare = template === 'Healthcare services / hospitals';
  const evidence = {
    ...metrics,
    quarterGrowthMissing: metrics.quarterRevenueGrowth == null || metrics.quarterAgeDays == null || metrics.quarterAgeDays > 200,
    leaseCoverageMissing: healthcare && (metrics.financeLeaseDebt == null || metrics.operatingLeaseDebt == null),
    ownerCashCoverageMissing: healthcare && (metrics.financeLeasePrincipal == null || metrics.noncontrollingDistributions == null),
    materialMinorityCash: metrics.noncontrollingDistributions != null && metrics.operatingCashflow > 0 && metrics.noncontrollingDistributions/metrics.operatingCashflow > .2,
    nonOperatingShare: !financial && metrics.netIncome > 0 && metrics.operatingIncome != null
      ? (metrics.netIncome - metrics.operatingIncome) / metrics.netIncome : null,
    equityToRevenue: metrics.totalEquity != null && metrics.totalRevenue > 0
      ? metrics.totalEquity / metrics.totalRevenue : null,
    softwareInvestmentMissing: software && metrics.capitalizedSoftware == null
  };
  const flags = [];
  let blocked = false;
  for (const rule of policy.rules) {
    if (financial && rule.nonFinancial) continue;
    const value = evidence[rule.field];
    const matches = rule.op === "missing" ? value == null
      : value != null && (rule.op === "lt" ? value < rule.value
        : rule.op === "lte" ? value <= rule.value
          : rule.op === "gt" ? value > rule.value : value === rule.value);
    if (!matches) continue;
    for (const [key, cap] of Object.entries(rule.caps)) scores[key] = Math.min(scores[key], cap);
    flags.push(rule.reason);
    blocked ||= Boolean(rule.block);
  }
  return {
    modelVersion: policy.version, scores, flags,
    highQualityEligible: !blocked && scores.quality >= 3 && scores.risk >= 3 && scores.sustainability >= 3
  };
}
