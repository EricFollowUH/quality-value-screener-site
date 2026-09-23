# Quality Value Screener

Interactive stock research dashboard built from the `quality-value-stock-screener` six-factor model.

## Data Architecture

- Market universe: US exchange-listed SEC filers. ETFs, securities without standardized SEC facts, and securities without a usable market price are excluded and counted in `coverage`.
- Fundamentals: SEC XBRL Frames API for annual fundamentals and recent balance-sheet values. The build does not download the multi-gigabyte SEC bulk archives.
- Price and company metadata: Nasdaq's listed-company screener snapshot during the weekly build.
- Market scoring: precomputed weekly with the same industry-aware growth, quality, cash flow, valuation, risk, and sustainability rules. `/api/snapshot` filters and sorts this full scoreable universe instead of rescoring 23 names per page request.
- Single-stock detail: computed on demand from SEC Company Facts plus a current public market price.
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
