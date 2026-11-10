import test from 'node:test';
import assert from 'node:assert/strict';
import { trailingValue, latestQuarterGrowth, readFinancials } from '../api/lib/financialFacts.js';
import { refineMetrics } from '../api/lib/refineMetrics.js';
import { applyModelGuardrails } from '../api/lib/modelGuardrails.js';
import { applyResearchEvidence } from '../api/lib/researchEvidence.js';
import { spawnSync } from 'node:child_process';
import { classifyTemplate } from '../api/lib/liveScreener.js';
test('an insurer with Health in its name is not a hospital',()=>{
 assert.equal(classifyTemplate('Finance','Accident & Health Insurance','Oscar Health Inc.','OSCR'),'Insurance');
 assert.equal(classifyTemplate('Public market','Business Services','Nutex Health Inc.','NUTX'),'Healthcare services / hospitals');
});
const fact = (start,end,val) => ({start,end,val,form:'10-Q',filed:'2026-11-05'});
const rows=[fact('2025-01-01','2025-12-31',100),fact('2026-01-01','2026-09-30',90),fact('2025-01-01','2025-09-30',70)];
test('TTM uses annual + current YTD - comparable prior YTD',()=>assert.equal(trailingValue(rows).value,120));
test('three Q1-Q3 standalone quarters are not called TTM',()=>{
  const r=trailingValue([fact('2026-01-01','2026-03-31',10),fact('2026-04-01','2026-06-30',20),fact('2026-07-01','2026-09-30',30)]);
  assert.equal(r,null);
});
test('quarter growth compares same quarter, not TTM with an old annual year',()=>{
  const r=latestQuarterGrowth([...rows,fact('2026-07-01','2026-09-30',80),fact('2025-07-01','2025-09-30',100)]);
  assert.equal(r.growth,-.2); assert.equal(r.end,'2026-09-30');
});

test('a legacy revenue tag cannot hide current values reported under a different standard alias',()=>{
 const company={facts:{'us-gaap':{
   RevenueFromContractWithCustomerExcludingAssessedTax:{units:{USD:[fact('2018-01-01','2018-03-31',1)]}},
   Revenues:{units:{USD:rows}}
 }}};
 assert.equal(readFinancials(company).periods.revenue.value,120);
});

const aligned={values:{revenue:1000,netIncome:100,operatingIncome:150,operatingCashflow:200,capex:10,financeLeasePrincipal:5,noncontrollingDistributions:50,cash:250,equity:400,longTermDebt:30,currentDebt:8,financeLeaseCurrent:7,financeLeaseNoncurrent:287,operatingLeaseCurrent:2,operatingLeaseNoncurrent:25},periods:Object.fromEntries(['revenue','netIncome','operatingIncome','operatingCashflow','capex','financeLeasePrincipal','noncontrollingDistributions'].map(k=>[k,{end:'2026-09-30',filed:'2026-11-05',basis:'TTM'}])),balanceEnd:'2026-09-30',quarter:{end:'2026-09-30',growth:-.187},latestPeriodNetIncome:152878000};
test('lease debt and minority cash are not ignored or double counted',()=>{
 const m=refineMetrics({marketCap:1000},aligned,'2026-11-10');
 assert.equal(m.totalDebt,332); assert.equal(m.ownerCashflow,135); assert.equal(m.fcfYield,.135);
});
test('unmatched CFO and revenue periods produce missing cash flow, not a blended ratio',()=>{
 const input=structuredClone(aligned); input.periods.operatingCashflow.end='2025-12-31';
 assert.equal(refineMetrics({marketCap:1000},input,'2026-11-10').freeCashflow,null);
});
test('Python and JS period refinement agree',()=>{
 const py=spawnSync(process.env.PYTHON||'python3',['-c','import json,sys; from scripts.financial_facts import refine_metrics; print(json.dumps(refine_metrics(*json.load(sys.stdin))))'],{input:JSON.stringify([{marketCap:1000},aligned,'2026-11-10']),encoding:'utf8'});
 assert.equal(py.status,0,py.stderr); assert.deepEqual(JSON.parse(py.stdout),refineMetrics({marketCap:1000},aligned,'2026-11-10'));
});
test('research evidence is sourced, never a fixed score, and expires on a newer report',()=>{
 const current=applyResearchEvidence('NUTX',{latestFiscalEnd:'2026-09-30',latestPeriodNetIncome:152878000},'2026-11-10');
 assert.ok(current.metrics.noncashReversalShare>.15); assert.equal(current.sources.length,2);
 assert.equal(applyResearchEvidence('NUTX',{latestFiscalEnd:'2026-12-31'},'2027-02-01').metrics.researchNeedsRefresh,1);
 const g=applyModelGuardrails('Healthcare services / hospitals',{...current.metrics,quarterRevenueGrowth:-.187,quarterAgeDays:41}, {growth:5,quality:5,cashFlow:5,valuation:5,risk:5,sustainability:5});
 assert.equal(g.scores.growth,2); assert.equal(g.scores.risk,2); assert.equal(g.scores.quality,3); assert.equal(g.highQualityEligible,false);
});
