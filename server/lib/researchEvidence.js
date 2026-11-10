import evidence from '../../research-evidence.json' with {type:'json'};
export const researchedTemplate = ticker => evidence[ticker]?.template;

export function applyResearchEvidence(ticker, metrics, asOf=new Date().toISOString()) {
  const item=evidence[ticker];
  if(!item) return {metrics, sources:[]};
  const matches=String(metrics.latestFiscalEnd)===item.periodEnd;
  const valid=asOf.slice(0,10)<=item.expiresAt && matches;
  let updated=valid ? {...metrics,...item.metrics,noncashReversalShare:metrics.latestPeriodNetIncome>0 && item.metrics.noncashReversalParentImpact!=null ? item.metrics.noncashReversalParentImpact/metrics.latestPeriodNetIncome : null} : {...metrics,researchNeedsRefresh:1};
  if(valid && item.metrics.customerFundsChange!=null && updated.operatingCashflow!=null) {
    updated.economicOperatingCashflow=updated.operatingCashflow-updated.customerFundsChange;
    updated.freeCashflow=updated.capex==null?null:updated.economicOperatingCashflow-Math.abs(updated.capex)-Math.abs(updated.capitalizedSoftware??0)-Math.abs(updated.intangibleInvestment??0);
    updated.fcfYield=updated.freeCashflow!=null && updated.marketCap>0?updated.freeCashflow/updated.marketCap:null;
    updated.ownerCashflow=null;
  }
  return {metrics:updated,sources:item.sources,note:item.note};
}
