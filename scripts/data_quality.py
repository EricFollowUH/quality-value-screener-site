"""The batch counterpart of api/lib/dataQuality.js; both consume model-policy."""
import json
import math
import re
from pathlib import Path

POLICY=json.loads((Path(__file__).resolve().parents[1]/'model-policy.json').read_text())

def assess_data(template,metrics,scores,blocked):
    def finite(key):
        value=metrics.get(key)
        return isinstance(value,(int,float)) and math.isfinite(value)
    age,quarter=metrics.get('financialAgeDays'),metrics.get('quarterAgeDays')
    stale=age is None or age>450 or quarter is None or quarter>200
    dimensions={}
    result=dict(scores)
    for dimension,required in POLICY['dataRequirements'].items():
        keys=['returnOnEquity'] if template=='Banks' and dimension=='quality' else required
        missing=any(not finite(key) for key in keys)
        if dimension=='quality' and template!='Banks':
            missing=not finite('operatingMargins') or sum(finite(key) for key in ['grossMargins','operatingMargins','returnOnEquity'])<2
        if dimension=='valuation':
            missing=missing or not any(finite(k) for k in ['forwardPE','trailingPE','fcfYield','priceToBook']) or template=='REITs'
        if dimension=='cashFlow':
            missing=missing or metrics.get('cashflowReviewRequired') is True
            if 'Games' in template:
                missing=missing or (not finite('capitalizedSoftware') and metrics.get('capexIncludesIntangibles')!=1)
            if template=='Healthcare services / hospitals':
                missing=missing or not finite('financeLeasePrincipal') or not finite('noncontrollingDistributions')
        if dimension=='risk' and template=='Healthcare services / hospitals':
            missing=missing or not finite('financeLeaseDebt') or not finite('operatingLeaseDebt')
        dimensions[dimension]='missing' if missing else 'stale' if stale else 'available'
        if missing:
            result[dimension]=None
    complete=all(status=='available' for status in dimensions.values())
    verified=metrics.get('companyFactsVerified')==1
    return dict(scores=result,totalScore=sum(result.values()) if all(v is not None for v in result.values()) else None,rankEligible=complete and verified and not blocked,dataQuality=dict(status='stale' if stale else 'complete' if complete else 'incomplete',complete=complete,companyFactsVerified=verified,dimensions=dimensions,checkedAt=metrics.get('fundamentalsCheckedAt'),periodEnd=metrics.get('latestFiscalEnd')))
