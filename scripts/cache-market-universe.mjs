import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const snapshot=JSON.parse(await fs.readFile(path.join(root,'public/data/us-market-scores.json'),'utf8'));
const previous=new Map(snapshot.scores.map(s=>[s.ticker,s]));
let stocks=snapshot.scores,asOf=snapshot.sourceDates?.universeAsOf??null,fallback=true;
try{
  const response=await fetch('https://api.nasdaq.com/api/screener/stocks?tableonly=true&limit=10000&offset=0&download=true',{headers:{'User-Agent':'Mozilla/5.0','Origin':'https://www.nasdaq.com','Referer':'https://www.nasdaq.com/'},signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error(`Nasdaq ${response.status}`);
  const result=await response.json();
  const rows=result.data?.rows??result.data?.table?.rows??[];
  if(rows.length<1000)throw Error('Incomplete universe');
  stocks=rows.filter(r=>/^[A-Z][A-Z0-9.-]{0,10}$/.test(r.symbol) && !/\bwarrants?\b|\bpreferred\b|\bunits?\b|\brights\b|notes due/i.test(r.name??'')).map(row=>{
    const ticker=row.symbol.replaceAll('.','-');
    const old=previous.get(ticker);
    return {...old,ticker,name:row.name??old?.name??ticker,sector:row.sector??old?.sector??'',industry:row.industry??old?.industry??'',metrics:old?.metrics??{},currentPrice:old?.currentPrice??null,quoteAsOf:old?.quoteAsOf??null};
  });
  asOf=new Date().toISOString();fallback=false;
}catch(error){process.stderr.write(`Universe source unavailable; retaining dated coverage, not claiming a fresh market census: ${error.message}\n`);}
await fs.mkdir(path.join(root,'.cache'),{recursive:true});
await fs.writeFile(path.join(root,'.cache/universe.json'),JSON.stringify({stocks,asOf,fallback}));
process.stdout.write(`Universe ${stocks.length}; metadata fallback ${fallback}\n`);
