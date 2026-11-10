import schema from '../../financial-schema.json' with {type:'json'};

const days = row => (Date.parse(row.end)-Date.parse(row.start))/86400000;
const near = (a,b) => Math.abs(Date.parse(a)-Date.parse(b)) <= 7*86400000;
const priorYear = date => `${Number(date.slice(0,4))-1}${date.slice(4)}`;

export function factRows(company, key) {
  const combined=[];
  for (const tag of schema[key] || []) {
    const rows = company.facts?.['us-gaap']?.[tag]?.units?.USD;
    if (rows?.length) combined.push(...rows.filter(r=>Number.isFinite(r.val) && ['10-K','10-Q','10-K/A','10-Q/A'].includes(r.form)));
  }
  return unique(combined);
}

function unique(rows) {
  const periods = new Map();
  for (const row of rows) {
    const key=`${row.start || ''}:${row.end}`;
    if (!periods.has(key) || (row.filed || '') > (periods.get(key).filed || '')) periods.set(key,row);
  }
  return [...periods.values()];
}

export function trailingValue(rows) {
  rows=unique(rows.filter(r=>r.start && r.end));
  const annual=rows.filter(r=>days(r)>=330 && days(r)<=380).sort((a,b)=>b.end.localeCompare(a.end))[0];
  if (!annual) return null;
  const ytd=rows.filter(r=>r.end>annual.end && near(r.start,new Date(Date.parse(annual.end)+86400000).toISOString().slice(0,10)) && days(r)<330)
    .sort((a,b)=>b.end.localeCompare(a.end))[0];
  if (!ytd) return {value:annual.val,end:annual.end,filed:annual.filed,basis:'annual'};
  const prior=rows.find(r=>near(r.start,priorYear(ytd.start)) && near(r.end,priorYear(ytd.end)));
  return prior ? {value:annual.val+ytd.val-prior.val,end:ytd.end,filed:ytd.filed,basis:'TTM'} : null;
}

export function latestQuarterGrowth(rows) {
  rows=unique(rows.filter(r=>r.start && days(r)>=65 && days(r)<=110));
  const current=rows.sort((a,b)=>b.end.localeCompare(a.end))[0];
  if (!current) return null;
  const previous=rows.find(r=>near(r.start,priorYear(current.start)) && near(r.end,priorYear(current.end)));
  return {growth:previous?.val>0 ? (current.val-previous.val)/previous.val : null,end:current.end};
}

export function readFinancials(company) {
  const values={}; const periods={};
  for(const key of ['revenue','netIncome','grossProfit','operatingIncome','operatingCashflow','capex','capitalizedSoftware','financeLeasePrincipal','noncontrollingDistributions','noncontrollingIncome']) {
    const period=trailingValue(factRows(company,key));
    if(period) { values[key]=period.value; periods[key]=period; }
  }
  const balanceRows=factRows(company,'equity').filter(r=>!r.start).sort((a,b)=>b.end.localeCompare(a.end) || (b.filed || '').localeCompare(a.filed || ''));
  const balanceEnd=balanceRows[0]?.end;
  for(const key of ['cash','equity','longTermDebt','currentDebt','shortTermDebt','financeLeaseCurrent','financeLeaseNoncurrent','operatingLeaseCurrent','operatingLeaseNoncurrent']) {
    const row=factRows(company,key).filter(r=>!r.start && r.end===balanceEnd).sort((a,b)=>(b.filed || '').localeCompare(a.filed || ''))[0];
    if(row) values[key]=row.val;
  }
  const latestYtd=factRows(company,'netIncome').filter(r=>r.start && days(r)>=65 && days(r)<=310).sort((a,b)=>b.end.localeCompare(a.end)||days(b)-days(a))[0];
  return {values,periods,balanceEnd,quarter:latestQuarterGrowth(factRows(company,'revenue')),earningsQuarter:latestQuarterGrowth(factRows(company,'netIncome')),latestPeriodNetIncome:latestYtd?.val ?? null};
}
