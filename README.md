# Quality Value Screener

Interactive stock research dashboard built from the `quality-value-stock-screener` six-factor model.

## Data Architecture

- Fundamentals: SEC Company Facts API, pulled server-side from official XBRL filings.
- Price: Yahoo Finance chart endpoint, pulled server-side for current public market price.
- Scoring: computed on every `/api/snapshot` request using industry-aware growth, quality, cash flow, valuation, risk, and sustainability rules.
- Fallback: the frontend keeps a static weekly snapshot so the page still renders if no serverless host is available.

## Live API

```text
GET /api/snapshot
GET /api/snapshot?tickers=MSFT,NVDA,V
```

The API returns:

- `generatedAt`
- `cadence: "live"`
- `source`
- `featuredTickers`
- `scores[]` with six dimensions, reasons, price, market cap, margins, FCF, leverage, and filing period.

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
