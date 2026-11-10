import {createServer} from 'node:http';
import {createServer as createViteServer} from 'vite';
import snapshot from '../api/snapshot.js';
import health from '../api/health.js';
import search from '../api/search.js';
const port=Number(process.env.PORT??5182);
process.env.US_MARKET_SNAPSHOT_URL=`http://127.0.0.1:${port}/data/us-market-scores.json`;
const vite=await createViteServer({server:{middlewareMode:true}});
const handlers={'/api/snapshot':snapshot,'/api/health':health,'/api/search':search};
const server=createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  const handler=handlers[url.pathname];
  if(!handler)return vite.middlewares(req,res);
  req.query=Object.fromEntries(url.searchParams);
  res.status=code=>{res.statusCode=code;return res;};
  res.json=value=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));};
  try{await handler(req,res);}catch(error){res.status(500).json({error:error.message});}
});
server.listen(port,'127.0.0.1',()=>process.stdout.write(`Local: http://127.0.0.1:${port}\n`));
process.on('SIGTERM',async()=>{await vite.close();server.close();});
