# Quality Value Screener

Interactive stock research dashboard built from the `quality-value-stock-screener` six-factor model.

## Data Architecture

- Market universe: US exchange-listed SEC filers. ETFs, securities without standardized SEC facts, and securities without a usable market price are excluded and counted in `coverage`.
- Fundamentals: SEC XBRL Frames API for annual fundamentals and recent balance-sheet values. The build does not download the multi-gigabyte SEC bulk archives.
- Price and company metadata: Nasdaq's listed-company screener plus an authenticated Yahoo Finance quote session during the weekly build.
- Valuation: consensus Forward P/E is the primary signal, with TTM P/E and FCF yield as checks. Banks and insurers also use P/B, energy weights FCF yield more heavily, and REIT valuation stays neutral until P/FFO or AFFO yield is available. If consensus FPE is missing, the response explicitly falls back to TTM P/E and FCF yield.
- Market scoring: precomputed weekly with the same industry-aware growth, quality, cash flow, valuation, risk, and sustainability rules. `/api/snapshot` filters and sorts this full scoreable universe instead of rescoring a small fixed ticker list per page request.
- Single-stock detail: computed on demand from SEC Company Facts plus current Yahoo price, Forward P/E, TTM P/E, and P/B fields.
- Fallback: the frontend keeps a static weekly snapshot so the page still renders if no serverless host is available.

## Live API

```text
GET /api/snapshot
GET /api/snapshot?tickers=MSFT,NVDA,V
GET /api/snapshot?sort=valuation&minDimensionScore=4&limit=100
GET /api/snapshot?template=Semiconductors%20%2F%20chip%20design&sort=totalScore
```

The API returns:

- `generatedAt`
- `cadence: "live"`
- `source`
- `featuredTickers`
- `scores[]` with six dimensions, reasons, price, market cap, margins, FCF, leverage, and filing period.
- `coverage` with listed, priced, scored, excluded, matched, and returned counts.

## Weekly market rebuild

GitHub Pages runs `scripts/build_us_market_snapshot.py` every Monday. It publishes the generated file at:

```text
https://ericfollowuh.github.io/quality-value-screener-site/data/us-market-scores.json
```

The Vercel API first reads the snapshot bundled with its deployment and applies filters server-side. Set `US_MARKET_SNAPSHOT_URL` when the weekly GitHub Pages copy should be the authoritative source. Set the GitHub Actions secret `SEC_USER_AGENT` to a descriptive app/contact value for SEC access.

## Deploy

This project needs a serverless host for real-time scoring. GitHub Pages can only serve the static fallback.

Recommended deployment:

```bash
vercel login
vercel deploy . -y
```

Set this environment variable in Vercel for cleaner SEC API identification:

```bash
SEC_USER_AGENT="quality-value-screener/1.0 your-email@example.com"
```

If using the Vercel Git integration, connect this repository and Vercel will deploy the Vite frontend plus `/api/snapshot` serverless function.

## Model v2.0

The MSGM false-positive review is in [public/model-review-msgm.md](public/model-review-msgm.md).
Both the Python market snapshot builder and JS live scorer apply
`model-policy.json`. Automated moat proxies are capped at 3; high-quality
labels require explicit eligibility, not just a total of 25. A-share scores
remain on their existing calculation and do not receive an unverified v2 label.
Run `npm test`, `python3 -m unittest tests/test_build_us_market_snapshot.py`,
and `npm run build` before publication. Production deployment requires approval.
The API accepts a weekly remote snapshot only when its model version matches
the deployed model and it is at least as recent as the bundled snapshot.
Otherwise it serves the deployment's bundled snapshot without changing its
original data timestamp. Weekly automation must also be updated to v2.
