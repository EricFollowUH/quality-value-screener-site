# Model v2.2: data integrity before ranking

## Scope
Keep six equally weighted dimensions, but separate data availability, financial
score and risk eligibility. Missing is null, never a zero-quality judgment.
Only complete, current, company-facts-backed records passing risk gates enter
normal rankings. Direct ticker search/comparison retains incomplete records.
Automated rankings are financial screening, not a researched investment verdict.

## Data contract
- Merge standard tag aliases by reporting period and latest filing.
- Derive gross profit only from period-aligned revenue and cost of revenue.
- Include productive-asset capex, capitalized software and intangible purchases.
- Preserve reported CFO; remove sourced customer-funding movements from economic
  cash before FCF and valuation. Unexplained outsized CFO requires review.
- Preserve field dates, filing accession and source URLs. Missing customer or
  minority ownership disclosures are not confirmed zero.
- Refresh all covered company facts daily with SEC rate limiting; refresh prices
  separately. Failed requests retain original checked/quote dates.
- Validate and atomically publish. Failed or mismatched artifacts never replace
  the last good snapshot. Show staleness and coverage honestly.

## Verification
Regression tests cover NVDA aliases/capex, unknown quality, PAYS customer funds,
MSGM/NUTX risk gates, JS/Python parity, ranking/search separation, stale fallback,
combined dimension filters and publishing validation. Rebuild full pool, inspect
case results, build UI, check desktop/mobile and deploy original Vercel domain.

## Limits
Public data can be delayed or incomplete. FPE remains a vendor estimate and
cannot receive the strongest value score without forecast coverage/period
verification. Moat proxies remain capped at 3. No claim of backtested alpha.
