import policy from '../../model-policy.json' with {type:'json'};

export function scoreQuality(template,gross,operating,roe){
  if(template==='Banks') return roe==null?0:roe>=.18?5:roe>=.14?4:roe>=.10?3:roe>=.06?2:1;
  const bands=policy.qualityBands[template]??policy.qualityBands.default;
  const points=(value,cutoffs)=>value==null?0:value>=cutoffs[0]?2:value>=cutoffs[1]?1:0;
  const available=(gross!=null?2:0)+(operating!=null?2:0)+(roe!=null?1:0);
  const earned=points(gross,bands.gross)+points(operating,bands.operating)+(roe!=null && roe>=bands.roe?1:0);
  return available?Math.round(earned/available*5):0;
}
