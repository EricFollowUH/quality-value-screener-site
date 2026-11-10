"""Period-aligned company facts; mirrored by api/lib/financialFacts.js."""
import json
from datetime import date, timedelta
from pathlib import Path

SCHEMA = json.loads((Path(__file__).resolve().parents[1] / 'financial-schema.json').read_text())

def rows_for(company, key):
    combined=[]
    for tag in SCHEMA[key]:
        rows = company.get('facts', {}).get('us-gaap', {}).get(tag, {}).get('units', {}).get('USD', [])
        if rows:
            combined.extend(r for r in rows if r.get('form') in ('10-K', '10-Q', '10-K/A', '10-Q/A') and isinstance(r.get('val'), (int,float)))
    return unique(combined)

def duration(r):
    return (date.fromisoformat(r['end']) - date.fromisoformat(r['start'])).days

def near(a,b):
    return abs((date.fromisoformat(a)-date.fromisoformat(b)).days)<=7

def prior_year(s):
    return str(int(s[:4])-1)+s[4:]

def unique(rows):
    result={}
    for r in rows:
        key=(r.get('start'),r['end'])
        if key not in result or r.get('filed','')>result[key].get('filed',''):
            result[key]=r
    return list(result.values())

def trailing_value(rows):
    rows=unique([r for r in rows if r.get('start') and r.get('end')])
    annual=sorted([r for r in rows if 330<=duration(r)<=380],key=lambda r:r['end'],reverse=True)
    if not annual:
        return None
    annual=annual[0]
    start=(date.fromisoformat(annual['end'])+timedelta(days=1)).isoformat()
    ytd=sorted([r for r in rows if r['end']>annual['end'] and near(r['start'],start) and duration(r)<330],key=lambda r:r['end'],reverse=True)
    if not ytd:
        return dict(value=annual['val'],end=annual['end'],filed=annual.get('filed'),basis='annual')
    ytd=ytd[0]
    previous=next((r for r in rows if near(r['start'],prior_year(ytd['start'])) and near(r['end'],prior_year(ytd['end']))),None)
    return dict(value=annual['val']+ytd['val']-previous['val'],end=ytd['end'],filed=ytd.get('filed'),basis='TTM') if previous else None

def quarter_growth(rows):
    rows=unique([r for r in rows if r.get('start') and 65<=duration(r)<=110])
    if not rows:
        return None
    current=max(rows,key=lambda r:r['end'])
    prior=next((r for r in rows if near(r['start'],prior_year(current['start'])) and near(r['end'],prior_year(current['end']))),None)
    return dict(growth=(current['val']-prior['val'])/prior['val'] if prior and prior['val']>0 else None,end=current['end'])

def read_financials(company):
    values,periods={},{}
    for key in list(SCHEMA)[:10]:
        period=trailing_value(rows_for(company,key))
        if period:
            values[key],periods[key]=period['value'],period
    balances=sorted([r for r in rows_for(company,'equity') if not r.get('start')],key=lambda r:(r['end'],r.get('filed','')),reverse=True)
    end=balances[0]['end'] if balances else None
    for key in list(SCHEMA)[10:]:
        rows=sorted([r for r in rows_for(company,key) if not r.get('start') and r['end']==end],key=lambda r:r.get('filed',''),reverse=True)
        if rows:
            values[key]=rows[0]['val']
    ytd=sorted([r for r in rows_for(company,'netIncome') if r.get('start') and 65<=duration(r)<=310],key=lambda r:(r['end'],duration(r)),reverse=True)
    return dict(values=values,periods=periods,balanceEnd=end,quarter=quarter_growth(rows_for(company,'revenue')),earningsQuarter=quarter_growth(rows_for(company,'netIncome')),latestPeriodNetIncome=ytd[0]['val'] if ytd else None)

def refine_metrics(base, f, as_of):
    v,p=f['values'],f['periods']
    end=p.get('revenue',{}).get('end')
    if not end:
        return base
    def aligned(key):
        return v.get(key) if p.get(key,{}).get('end')==end else None
    def ratio(a,b):
        return a/b if a is not None and b is not None and b>0 else None
    def known(*items):
        return sum(x for x in items if x is not None) if any(x is not None for x in items) else None
    revenue,income,op=v['revenue'],aligned('netIncome'),aligned('operatingIncome')
    ocf,capex,software=aligned('operatingCashflow'),aligned('capex'),aligned('capitalizedSoftware')
    principal,distributions=aligned('financeLeasePrincipal'),aligned('noncontrollingDistributions')
    lease=known(v.get('financeLeaseCurrent'),v.get('financeLeaseNoncurrent'))
    bank=known(v.get('longTermDebt'),v.get('currentDebt'),v.get('shortTermDebt'))
    debt=known(bank,lease)
    fcf=ocf-abs(capex)-abs(software or 0) if ocf is not None and capex is not None else None
    owner=fcf-abs(principal)-abs(distributions) if fcf is not None and principal is not None and distributions is not None else None
    quarter=f.get('quarter')
    return {**base,'netIncome':income,'operatingIncome':op,'totalRevenue':revenue,'totalEquity':v.get('equity'),'totalCash':v.get('cash'),
        'totalDebt':debt,'financeLeaseDebt':lease,'operatingLeaseDebt':known(v.get('operatingLeaseCurrent'),v.get('operatingLeaseNoncurrent')),
        'capex':capex,'capitalizedSoftware':software,'operatingCashflow':ocf,'freeCashflow':fcf,'ownerCashflow':owner,'financeLeasePrincipal':principal,'noncontrollingDistributions':distributions,
        'fcfYield':ratio(owner if owner is not None else fcf,base.get('marketCap')),'grossMargins':ratio(aligned('grossProfit'),revenue),'operatingMargins':ratio(op,revenue),'returnOnEquity':ratio(income,v.get('equity')),'ebitda':op,'debtToEquity':ratio(debt,v.get('equity')),
        'latestFiscalEnd':end,'latestBalanceEnd':f.get('balanceEnd'),'fundamentalsBasis':p['revenue']['basis'],'financialFiledAt':p['revenue'].get('filed'),
        'quarterRevenueGrowth':quarter.get('growth') if quarter else None,'latestQuarterEnd':quarter.get('end') if quarter else None,
        'quarterEarningsGrowth':f['earningsQuarter']['growth'] if f.get('earningsQuarter') and quarter and f['earningsQuarter']['end']==quarter['end'] else None,
        'quarterAgeDays':(date.fromisoformat(as_of[:10])-date.fromisoformat(quarter['end'])).days if quarter else None,'latestPeriodNetIncome':f.get('latestPeriodNetIncome')}
