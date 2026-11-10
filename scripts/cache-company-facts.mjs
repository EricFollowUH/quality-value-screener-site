import fs from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const directory=path.join(root,'.cache/company-facts');
await fs.mkdir(directory,{recursive:true});
const headers={'User-Agent':process.env.SEC_USER_AGENT||'quality-value-screener data-pipeline@example.com'};
const response=await fetch('https://www.sec.gov/files/company_tickers_exchange.json',{headers,signal:AbortSignal.timeout(30000)});
if(!response.ok) throw Error(`SEC index ${response.status}`);
const index=await response.json();
const universe=JSON.parse(await fs.readFile(path.join(root,'.cache/universe.json'),'utf8').catch(()=>'{"stocks":[]}'));
const stocks=universe.stocks.length?universe.stocks:JSON.parse(await fs.readFile(path.join(root,'public/data/us-market-scores.json'),'utf8')).scores;
const tickers=new Set(stocks.map(s=>s.ticker));
const ci=index.fields.indexOf('cik'),ti=index.fields.indexOf('ticker');
const ciks=[...new Set(index.data.filter(r=>tickers.has(r[ti].replaceAll('.','-'))).map(r=>String(r[ci]).padStart(10,'0')))];
let cursor=0,done=0,failed=0,nextRequest=0;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function worker(){
  while(cursor<ciks.length){
    const cik=ciks[cursor++],file=path.join(directory,`${cik}.json.gz`);
    try{
      const stat=await fs.stat(file).catch(()=>null);
      if(!stat || Date.now()-stat.mtimeMs>8*3600000){
        const scheduled=Math.max(Date.now(),nextRequest);nextRequest=scheduled+160;
        await sleep(Math.max(0,scheduled-Date.now()));
        const r=await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`,{headers,signal:AbortSignal.timeout(30000)});
        if(!r.ok) throw Error(`SEC ${r.status}`);
        const company=await r.json();
        if(!company.facts) throw Error('Missing facts');
        await fs.writeFile(`${file}.tmp`,gzipSync(JSON.stringify({checkedAt:new Date().toISOString(),company})));
        await fs.rename(`${file}.tmp`,file);
      }
    }catch(error){failed++;process.stdout.write(`Unavailable ${cik}: ${error.message}\n`);}
    done++;if(done%100===0||done===ciks.length)process.stdout.write(`SEC ${done}/${ciks.length}; failed ${failed}\n`);
  }
}
await Promise.all([worker(),worker(),worker()]);
process.stdout.write('SEC download complete\n');
