"""Re-enrich candidates without re-fetching prices or misdating existing quotes."""
import json
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from scripts.build_us_market_snapshot import OUTPUT, RESEARCH, load_sec_tickers, request_json, evaluate_metrics
from scripts.financial_facts import read_financials, refine_metrics

def main():
    snapshot=json.loads(OUTPUT.read_text(encoding='utf-8'))
    now=datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace('+00:00','Z')
    index,_=load_sec_tickers()
    selected={s['ticker'] for s in snapshot['scores'][:50]} | set(RESEARCH)
    def refresh(stock):
        if stock['template']=='Healthcare services / hospitals':
            stock={**stock,'sector':'Healthcare','industry':stock['template'] if stock['industry']=='Business Services' else stock['industry']}
        if stock['ticker'] not in selected:
            return stock
        try:
            cik=index[stock['ticker']]['cik']
            facts=request_json(f'https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json',sec=True)
            metrics=refine_metrics(stock['metrics'],read_financials(facts),now)
            print(f'Reviewed {stock["ticker"]}',flush=True)
            return {**stock,**evaluate_metrics(stock['ticker'],stock['template'],metrics,now)}
        except Exception as exc:
            print(f'Kept dated record for {stock["ticker"]}: {exc}',flush=True)
            return stock
    with ThreadPoolExecutor(max_workers=3) as pool:
        snapshot['scores']=list(pool.map(refresh,snapshot['scores']))
    snapshot['scores'].sort(key=lambda s:(-s['totalScore'],s['ticker']))
    snapshot['generatedAt']=now
    snapshot['featuredTickers']=[s['ticker'] for s in snapshot['scores'][:5]]
    snapshot['coverage']['alignedCompanyCount']=sum(bool(s['metrics'].get('financialFiledAt')) for s in snapshot['scores'])
    OUTPUT.write_text(json.dumps(snapshot,ensure_ascii=False,separators=(',',':')),encoding='utf-8')

if __name__=='__main__':
    main()
