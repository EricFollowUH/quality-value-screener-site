const ratio=(a,b)=>a!=null && b>0 ? a/b : null;
const sumKnown=(...items)=>items.some(v=>v!=null) ? items.reduce((s,v)=>s+(v??0),0) : null;
const same=(p,end)=>p?.end===end;

export function refineMetrics(base, f, asOf) {
  const v=f.values,p=f.periods,end=p.revenue?.end;
  if(!end) return base;
  const aligned=key=>same(p[key],end) ? v[key] : null;
  const revenue=v.revenue, income=aligned('netIncome'),op=aligned('operatingIncome');
  const ocf=aligned('operatingCashflow'),capex=aligned('capex'),software=aligned('capitalizedSoftware');
  const principal=aligned('financeLeasePrincipal'),distributions=aligned('noncontrollingDistributions');
  const leaseDebt=sumKnown(v.financeLeaseCurrent,v.financeLeaseNoncurrent);
  const bankDebt=sumKnown(v.longTermDebt,v.currentDebt,v.shortTermDebt);
  const debt=sumKnown(v.debtCombinedNoncurrent??sumKnown(v.longTermDebt,v.financeLeaseNoncurrent),v.debtCombinedCurrent??sumKnown(v.currentDebt,v.financeLeaseCurrent),v.shortTermDebt);
  const customerFunds=aligned('customerFundsChange'),intangible=aligned('intangibleInvestment');
  const combinedInvestment=p.capex?.tag==='PaymentsToAcquireProductiveAssets';
  const economic=ocf==null?null:ocf-(customerFunds??0);
  const fcf=economic!=null && capex!=null ? economic-Math.abs(capex)-(combinedInvestment?0:Math.abs(software??0)+Math.abs(intangible??0)) : null;
  const owner=fcf!=null && principal!=null && distributions!=null ? fcf-Math.abs(principal)-Math.abs(distributions) : null;
  return {...base,netIncome:income,operatingIncome:op,totalRevenue:revenue,totalEquity:v.equity??null,totalCash:v.cash??null,
    totalDebt:debt,financeLeaseDebt:leaseDebt,operatingLeaseDebt:sumKnown(v.operatingLeaseCurrent,v.operatingLeaseNoncurrent),
    capex,capitalizedSoftware:software,intangibleInvestment:intangible,customerFundsChange:customerFunds,economicOperatingCashflow:economic,operatingCashflow:ocf,freeCashflow:fcf,ownerCashflow:owner,financeLeasePrincipal:principal,noncontrollingDistributions:distributions,
    fcfYield:ratio(owner??fcf,base.marketCap),grossMargins:ratio(aligned('grossProfit'),revenue),operatingMargins:ratio(op,revenue),returnOnEquity:ratio(income,v.equity),ebitda:op,debtToEquity:ratio(debt,v.equity),
    latestFiscalEnd:end,latestBalanceEnd:f.balanceEnd,fundamentalsBasis:p.revenue.basis,financialFiledAt:p.revenue.filed,
    quarterRevenueGrowth:f.quarter?.growth??null,latestQuarterEnd:f.quarter?.end??null,
    quarterEarningsGrowth:f.earningsQuarter?.end===f.quarter?.end ? f.earningsQuarter?.growth??null:null,
    quarterAgeDays:f.quarter ? Math.floor((Date.parse(asOf)-Date.parse(f.quarter.end))/86400000):null,
    latestPeriodNetIncome:f.latestPeriodNetIncome,
    fundamentalsCheckedAt:asOf,financialAgeDays:Math.floor((Date.parse(asOf)-Date.parse(end))/86400000),
    companyFactsVerified:1,provenance:f.provenance??{},dilutedShares:v.dilutedShares??null,
    cashAndShortTermInvestments:v.cashAndShortTermInvestments??null,profitHistoryYears:v.profitHistoryYears??null,profitableYears:v.profitableYears??null,capexIncludesIntangibles:combinedInvestment?1:0};
}
