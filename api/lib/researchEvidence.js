import evidence from '../../research-evidence.json' with {type:'json'};

export function applyResearchEvidence(ticker, metrics, asOf=new Date().toISOString()) {
  const item=evidence[ticker];
  if(!item) return {metrics, sources:[]};
  const matches=String(metrics.latestFiscalEnd)===item.periodEnd;
  const valid=asOf.slice(0,10)<=item.expiresAt && matches;
  return {metrics:valid ? {...metrics,...item.metrics,noncashReversalShare:metrics.latestPeriodNetIncome>0 ? item.metrics.noncashReversalParentImpact/metrics.latestPeriodNetIncome : null} : {...metrics,researchNeedsRefresh:1}, sources:item.sources,note:item.note};
}
