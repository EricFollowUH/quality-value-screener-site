import policy from '../../model-policy.json' with {type:'json'};

export function assessData(template, metrics, scores, blocked) {
  const age=metrics.financialAgeDays;
  const stale=age==null || age>450 || metrics.quarterAgeDays==null || metrics.quarterAgeDays>200;
  const dimensions={};
  const result={...scores};
  const finite=key=>typeof metrics[key]==='number' && Number.isFinite(metrics[key]);
  for(const [dimension,required] of Object.entries(policy.dataRequirements)) {
    const keys=template==='Banks' && dimension==='quality'?['returnOnEquity']:required;
    let missing=keys.some(key=>!finite(key));
    if(dimension==='quality' && template!=='Banks') missing=!finite('operatingMargins') || ['grossMargins','operatingMargins','returnOnEquity'].filter(finite).length<2;
    if(dimension==='valuation') missing ||= !['forwardPE','trailingPE','fcfYield','priceToBook'].some(finite) || template==='REITs';
    if(dimension==='cashFlow') missing ||= metrics.cashflowReviewRequired===true;
    if(dimension==='cashFlow' && /Games/.test(template)) missing ||= !finite('capitalizedSoftware') && metrics.capexIncludesIntangibles!==1;
    if(dimension==='cashFlow' && template==='Healthcare services / hospitals') missing ||= !finite('financeLeasePrincipal') || !finite('noncontrollingDistributions');
    if(dimension==='risk' && template==='Healthcare services / hospitals') missing ||= !finite('financeLeaseDebt') || !finite('operatingLeaseDebt');
    dimensions[dimension]=missing?'missing':stale?'stale':'available';
    if(missing) result[dimension]=null;
  }
  const complete=Object.values(dimensions).every(status=>status==='available');
  const verified=metrics.companyFactsVerified===1;
  const rankEligible=complete && verified && !blocked;
  const totalScore=Object.values(result).every(Number.isFinite)?Object.values(result).reduce((a,b)=>a+b,0):null;
  return {scores:result,totalScore,rankEligible,dataQuality:{status:stale?'stale':complete?'complete':'incomplete',complete,companyFactsVerified:verified,dimensions,checkedAt:metrics.fundamentalsCheckedAt??null,periodEnd:metrics.latestFiscalEnd??null}};
}
