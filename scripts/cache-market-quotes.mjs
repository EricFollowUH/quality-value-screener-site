import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const headers={'User-Agent':'Mozilla/5.0 QualityValueScreener/2.2'};
const snapshot=JSON.parse(await fs.readFile(path.join(root,'public/data/us-market-scores.json'),'utf8'));
const universe=JSON.parse(await fs.readFile(path.join(root,'.cache/universe.json'),'utf8').catch(()=>'{"stocks":[]}'));
if(universe.stocks.length)snapshot.scores=universe.stocks;
try{
  const cookieResponse=await fetch('https://fc.yahoo.com/',{headers,signal:AbortSignal.timeout(20000)});
  const cookie=cookieResponse.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
  const crumbResponse=await fetch('https://query2.finance.yahoo.com/v1/test/getcrumb',{headers:{...headers,Cookie:cookie},signal:AbortSignal.timeout(20000)});
  if(!crumbResponse.ok) throw Error(`Yahoo session ${crumbResponse.status}`);
  const crumb=await crumbResponse.text(),quotes={};
  for(let i=0;i<snapshot.scores.length;i+=100){
    const symbols=snapshot.scores.slice(i,i+100).map(s=>s.ticker).join(',');
    const url=`https://query2.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&crumb=${encodeURIComponent(crumb)}`;
    const response=await fetch(url,{headers:{...headers,Cookie:cookie},signal:AbortSignal.timeout(30000)});
    if(!response.ok) throw Error(`Yahoo quotes ${response.status}`);
    const data=await response.json();
    for(const quote of data.quoteResponse?.result??[])quotes[quote.symbol]=quote;
    if(i%500===0)process.stdout.write(`Quotes ${Object.keys(quotes).length}\n`);
    await new Promise(resolve=>setTimeout(resolve,200));
  }
  if(Object.keys(quotes).length<snapshot.scores.length*.8)throw Error('Quote coverage below 80%');
  await fs.mkdir(path.join(root,'.cache'),{recursive:true});
  await fs.writeFile(path.join(root,'.cache/yahoo-quotes.json'),JSON.stringify({checkedAt:new Date().toISOString(),quotes}));
  process.stdout.write(`Verified provider quotes: ${Object.keys(quotes).length}\n`);
}catch(error){
  process.stderr.write(`Quote update failed; retained original quote dates: ${error.message}\n`);
  process.exitCode=1;
}
