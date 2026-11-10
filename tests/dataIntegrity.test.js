import test from 'node:test';
import assert from 'node:assert/strict';
import { readFinancials } from '../api/lib/financialFacts.js';
import { refineMetrics } from '../api/lib/refineMetrics.js';
import { scoreCompany } from '../api/lib/liveScreener.js';
import { queryMarketSnapshot, selectCompatibleSnapshot } from '../api/lib/marketSnapshot.js';
import {spawnSync} from 'node:child_process';

const fact=(start,end,val)=>({start,end,val,form:'10-Q',filed:'2026-08-26',accn:'0001045810-26-000075'});
const annual=(val)=>fact('2025-01-27','2026-01-25',val);
const company={cik:1045810,facts:{'us-gaap':Object.fromEntries(Object.entries({
 Revenues:[annual(200),fact('2026-01-26','2026-07-26',150),fact('2025-01-27','2025-07-27',90)],
 CostOfRevenue:[annual(50),fact('2026-01-26','2026-07-26',38),fact('2025-01-27','2025-07-27',24)],
 PaymentsToAcquireProductiveAssets:[annual(6),fact('2026-01-26','2026-07-26',4),fact('2025-01-27','2025-07-27',3)]
}).map(([k,v])=>[k,{units:{USD:v}}]))}};
test('gross profit can be derived from same-period revenue and cost; productive asset capex alias works',()=>{
 const f=readFinancials(company);
 assert.equal(f.values.grossProfit,196);
 assert.equal(f.values.capex,7);
 assert.equal(f.periods.revenue.end,'2026-07-26');
 assert.ok(f.provenance.revenue.url.includes('1045810'));
});
test('a discontinued gross-profit tag does not hide current derived gross profit',()=>{
 const input=structuredClone(company);
 input.facts['us-gaap'].GrossProfit={units:{USD:[fact('2021-01-01','2021-12-31',30)]}};
 assert.equal(readFinancials(input).values.grossProfit,196);
 assert.equal(readFinancials(input).periods.grossProfit.end,'2026-07-26');
});
test('a malformed instant diluted-share row cannot erase valid financial statements',()=>{
 const input=structuredClone(company);
 input.facts['us-gaap'].WeightedAverageNumberOfDilutedSharesOutstanding={units:{shares:[{end:'2026-07-26',val:100,form:'10-Q'}]}};
 const py=spawnSync('python3',['-c','import json,sys; from scripts.financial_facts import read_financials; print(json.dumps(read_financials(json.load(sys.stdin))))'],{input:JSON.stringify(input),encoding:'utf8'});
 assert.equal(py.status,0,py.stderr);
 assert.equal(JSON.parse(py.stdout).values.revenue,260);
});
test('missing quality inputs are unknown, never zero or a complete total',()=>{
 const s=scoreCompany({ticker:'TEST',name:'Test',template:'General quality/value',metrics:{marketCap:1e9}});
 assert.equal(s.quality,null);
 assert.equal(s.totalScore,null);
 assert.equal(s.rankEligible,false);
 assert.equal(s.dataQuality.dimensions.quality,'missing');
});
test('customer fund growth is removed from economic cash, retaining reported CFO',()=>{
 const periods=Object.fromEntries(['revenue','operatingCashflow','capex','capitalizedSoftware'].map(k=>[k,{end:'2026-09-30',basis:'TTM'}]));
 const m=refineMetrics({marketCap:1000},{values:{revenue:100,operatingCashflow:130,capex:1,capitalizedSoftware:5,customerFundsChange:90},periods:{...periods,customerFundsChange:{end:'2026-09-30'}},balanceEnd:'2026-09-30'},'2026-11-10');
 assert.equal(m.operatingCashflow,130);
 assert.equal(m.economicOperatingCashflow,40);
 assert.equal(m.freeCashflow,34);
});
test('productive-assets capex already includes software and intangibles, so do not deduct twice',()=>{
 const periods=Object.fromEntries(['revenue','operatingCashflow','capex','capitalizedSoftware','intangibleInvestment'].map(k=>[k,{end:'2026-09-30',basis:'TTM'}]));
 periods.capex.tag='PaymentsToAcquireProductiveAssets';
 const m=refineMetrics({marketCap:1000},{values:{revenue:100,operatingCashflow:40,capex:7,capitalizedSoftware:2,intangibleInvestment:1},periods,balanceEnd:'2026-09-30'},'2026-11-10');
 assert.equal(m.freeCashflow,33);
});
test('normal ranking excludes incomplete and risk-blocked records but direct search retains them',()=>{
 const snapshot={generatedAt:'2026-11-10',scores:[{ticker:'BAD',totalScore:29,rankEligible:false},{ticker:'GOOD',totalScore:24,rankEligible:true}],source:'test'};
 assert.deepEqual(queryMarketSnapshot(snapshot).scores.map(s=>s.ticker),['GOOD']);
 assert.equal(queryMarketSnapshot(snapshot,{q:'BAD'}).scores[0].ticker,'BAD');
});
test('a newer incomplete remote artifact cannot replace the validated last good snapshot',()=>{
 const good={modelVersion:'2.2.0',generatedAt:'2026-11-09',validation:{passed:true},scores:[{ticker:'A'}]};
 const bad={...good,generatedAt:'2026-11-10',validation:{passed:false}};
 assert.equal(selectCompatibleSnapshot(bad,good),good);
});
test('retail quality is not judged by software gross-margin thresholds',()=>{
 const metrics={marketCap:1e10,grossMargins:.36,operatingMargins:.09,returnOnEquity:.20};
 const retail=scoreCompany({ticker:'T',template:'Retail / e-commerce',metrics});
 const software=scoreCompany({ticker:'S',template:'SaaS / enterprise software',metrics});
 assert.ok(retail.quality>software.quality);
});
test('unverified low forward PE cannot outweigh expensive realized earnings and weak cash yield',()=>{
 const s=scoreCompany({ticker:'T',template:'General quality/value',metrics:{marketCap:1e10,totalRevenue:1e10,forwardPE:1,trailingPE:60,fcfYield:.01,freeCashflow:1e8,operatingCashflow:2e8,capex:1e8}});
 assert.equal(s.valuation,1);
});
test('independently cheap TTM earnings and verified cash yield can earn strong value without FPE',()=>{
 const s=scoreCompany({ticker:'T',template:'General quality/value',metrics:{marketCap:1e10,totalRevenue:1e10,forwardPE:null,trailingPE:8,fcfYield:.10,freeCashflow:1e9,operatingCashflow:1.1e9,capex:1e8}});
 assert.equal(s.valuation,5);
});
