"""Rebuild every covered company's score, validate, then atomically publish."""
import gzip
import json
from datetime import datetime,timezone
from scripts.build_us_market_snapshot import ROOT,OUTPUT,POLICY,load_sec_tickers,classify_template,evaluate_metrics
from scripts.financial_facts import read_financials,refine_metrics

def validate(snapshot,previous=None):
    scores=snapshot['scores']
    errors=[]
    if len(scores)<1000:
        errors.append('Market coverage below 1000')
    eligible=[s for s in scores if s.get('rankEligible')]
    if len(eligible)<10:
        errors.append('Fewer than ten complete eligible records')
    verified=sum(s.get('metrics',{}).get('companyFactsVerified')==1 for s in scores)
    retrieved=sum(s.get('metrics',{}).get('companyFactsRetrieved')==1 for s in scores)
    if retrieved<len(scores)*.90:
        errors.append('Fewer than 90% of covered records have company-facts checks')
    if previous and previous.get('modelVersion')==POLICY['version'] and previous.get('validation',{}).get('passed'):
        old={s['ticker']:s for s in previous['scores']}
        current={s['ticker']:s for s in scores}
        common=old.keys() & current.keys()
        if len(scores)<len(old)*.8:
            errors.append('Coverage fell by more than 20%')
        for key in ['totalRevenue','grossMargins','operatingMargins','operatingCashflow','capex']:
            before=sum(old[t]['metrics'].get(key) is not None for t in common)
            after=sum(current[t]['metrics'].get(key) is not None for t in common)
            if before and after<before*.8:
                errors.append(f'{key}: comparable field coverage fell by more than 20%')
    for stock in scores:
        values=[stock[k] for k in POLICY['dataRequirements']]
        if stock['totalScore'] is not None and (any(v is None for v in values) or sum(values)!=stock['totalScore']):
            errors.append(f'{stock["ticker"]}: inconsistent total')
        if stock.get('rankEligible') and (stock['totalScore'] is None or not stock['dataQuality']['complete']):
            errors.append(f'{stock["ticker"]}: incomplete ranking entry')
    nvda=next((s for s in scores if s['ticker']=='NVDA'),None)
    if not nvda or nvda['quality'] is None or nvda['metrics']['grossMargins'] is None or nvda['metrics']['capex'] is None:
        errors.append('NVDA critical-field regression')
    return {'passed':not errors,'errors':errors,'verifiedCompanyCount':verified,'retrievedCompanyCount':retrieved,'rankEligibleCount':len(eligible)}

def main():
    now=datetime.now(timezone.utc).isoformat().replace('+00:00','Z')
    snapshot=json.loads(OUTPUT.read_text())
    previous_snapshot=json.loads(OUTPUT.read_text())
    index,_=load_sec_tickers()
    universe_path=ROOT/'.cache'/'universe.json'
    universe=json.loads(universe_path.read_text()) if universe_path.exists() else {}
    stocks=universe.get('stocks') or snapshot['scores']
    quote_path=ROOT/'.cache'/'yahoo-quotes.json'
    quote_record=json.loads(quote_path.read_text()) if quote_path.exists() else {}
    quotes=quote_record.get('quotes',{}) if quote_record.get('checkedAt','')[:10]==now[:10] else {}
    scores=[]
    unverified_count=0
    for stock in stocks:
        ticker=stock['ticker']
        if ticker not in index:
            continue
        path=ROOT/'.cache'/'company-facts'/f'{index.get(ticker,{}).get("cik")}.json.gz'
        metrics=dict(stock['metrics'])
        quote=quotes.get(ticker,{})
        if quote.get('regularMarketPrice') is not None and quote.get('regularMarketTime') is not None:
            stock={**stock,'currentPrice':quote['regularMarketPrice'],'quoteAsOf':datetime.fromtimestamp(quote['regularMarketTime'],timezone.utc).isoformat().replace('+00:00','Z')}
            change=quote.get('regularMarketChangePercent')
            metrics.update(marketCap=quote.get('marketCap'),forwardPE=quote.get('forwardPE'),trailingPE=quote.get('trailingPE'),forwardEps=quote.get('epsForward'),trailingEps=quote.get('epsTrailingTwelveMonths'),priceToBook=quote.get('priceToBook'),previousClose=quote.get('regularMarketPreviousClose'),percentChange=change/100 if change is not None else None,consensusAsOf=quote_record['checkedAt'])
        template=classify_template(stock['sector'],stock['industry'],ticker,stock['name'])
        try:
            with gzip.open(path,'rt',encoding='utf-8') as handle:
                record=json.load(handle)
            age=(datetime.now(timezone.utc)-datetime.fromisoformat(record['checkedAt'].replace('Z','+00:00'))).total_seconds()
            if age>36*3600:
                raise ValueError('SEC retrieval older than 36 hours')
            financials=read_financials(record['company'])
            metrics=refine_metrics(metrics,financials,record['checkedAt'])
            metrics['companyFactsRetrieved']=1
            if financials['periods'].get('revenue'):
                metrics['financialAgeDays']=(datetime.now(timezone.utc).date()-datetime.fromisoformat(metrics['latestFiscalEnd']).date()).days
            else:
                metrics['companyFactsVerified']=0
                metrics['unsupportedFinancialFormat']=1
        except Exception as error:
            metrics['companyFactsVerified']=0
            metrics['companyFactsRetrieved']=0
            unverified_count+=1
            if unverified_count<=10:
                print(f'Unverified {ticker}: {type(error).__name__}',flush=True)
        quote_age=(datetime.now(timezone.utc)-datetime.fromisoformat(stock['quoteAsOf'].replace('Z','+00:00'))).total_seconds()/86400 if stock.get('quoteAsOf') else 999
        metrics['quoteAgeDays']=quote_age
        evaluated=evaluate_metrics(ticker,template,metrics,now)
        scores.append({**stock,**evaluated,'template':template})
    scores.sort(key=lambda s:(not s['rankEligible'],-(s['totalScore'] if s['totalScore'] is not None else -1),s['ticker']))
    snapshot.update(modelVersion=POLICY['version'],generatedAt=now,cadence='daily',scores=scores,source='每日财务初筛：SEC逐公司财报；缺失不记零分。通过数据完整性、时效及已覆盖风险闸门后进入榜单，非人工尽调结论。',featuredTickers=[s['ticker'] for s in scores if s['rankEligible']][:5])
    snapshot['validation']=validate(snapshot,previous_snapshot)
    snapshot['coverage'].update(listedCount=len(index),factsCount=snapshot['validation']['retrievedCompanyCount'],pricedCount=sum(s.get('currentPrice') is not None for s in scores),scoredCount=sum(s['totalScore'] is not None for s in scores),coveredCount=len(scores),rankEligibleCount=sum(s['rankEligible'] for s in scores),incompleteCount=sum(s['totalScore'] is None for s in scores),alignedCompanyCount=snapshot['validation']['verifiedCompanyCount'],excludedCount=len(index)-len(scores))
    snapshot['updatePolicy']={'schedule':'每日23:30 UTC','maxSnapshotAgeHours':48,'failureBehavior':'保留上次通过验证的快照及真实数据时间；页面显示过期告警'}
    snapshot['coverage']['metadataFallback']=universe.get('fallback',True)
    snapshot['sourceDates']={**snapshot.get('sourceDates',{}),'universeAsOf':universe.get('asOf'),'consensusAsOf':quote_record.get('checkedAt') if quotes else snapshot.get('sourceDates',{}).get('consensusAsOf'),'priceAsOf':max((s.get('quoteAsOf') or '' for s in scores),default=None),'secCheckedAt':max((s['metrics'].get('fundamentalsCheckedAt') or '' for s in scores),default=None)}
    if snapshot['coverage']['metadataFallback']:
        snapshot['source']+=' 交易所目录本次不可用，覆盖范围沿用原记录，不代表已完成最新上市清单核验。'
    if not snapshot['validation']['passed']:
        raise SystemExit(json.dumps(snapshot['validation'],ensure_ascii=False))
    temporary=OUTPUT.with_suffix('.tmp')
    temporary.write_text(json.dumps(snapshot,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    temporary.replace(OUTPUT)
    print(json.dumps(snapshot['validation'],ensure_ascii=False),flush=True)

if __name__=='__main__':
    main()
