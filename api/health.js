import {loadMarketSnapshot} from './lib/marketSnapshot.js';

export default async function handler(req,res){
  const snapshot=await loadMarketSnapshot();
  const ageHours=(Date.now()-Date.parse(snapshot.generatedAt))/3600000;
  const healthy=snapshot.validation?.passed===true && ageHours<=48;
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','no-store');
  res.status(healthy?200:503).json({status:healthy?'ok':'stale-or-invalid',modelVersion:snapshot.modelVersion,lastSuccessfulUpdate:snapshot.generatedAt,ageHours:Math.round(ageHours*10)/10,coverage:snapshot.coverage,validation:snapshot.validation,updatePolicy:snapshot.updatePolicy});
}
