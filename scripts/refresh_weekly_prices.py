#!/usr/bin/env python3
"""Refresh static stock prices for the GitHub Pages build.

The browser cannot reliably call Yahoo Finance directly because of CORS, so the
public static site refreshes its embedded weekly price snapshot during CI.
"""

from __future__ import annotations

import json
import re
import ssl
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DATA_FILE = ROOT / "src" / "fallbackData.ts"
TICKER_RE = re.compile(r'stock\(\s*\n\s*"([A-Z.]+)"')
DATE_RE = re.compile(r'generatedAt: "[^"]+"')


def fetch_price(ticker: str) -> float | None:
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?range=1d&interval=1d"
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 QualityValueScreener/1.0"})
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except ssl.SSLCertVerificationError:
        context = ssl._create_unverified_context()
        with urllib.request.urlopen(request, timeout=20, context=context) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.URLError as exc:
        if isinstance(exc.reason, ssl.SSLCertVerificationError):
            context = ssl._create_unverified_context()
            with urllib.request.urlopen(request, timeout=20, context=context) as response:
                payload = json.loads(response.read().decode("utf-8"))
        else:
            print(f"warning: could not refresh {ticker}: {exc}", file=sys.stderr)
            return None
    except Exception as exc:  # noqa: BLE001
        print(f"warning: could not refresh {ticker}: {exc}", file=sys.stderr)
        return None
    try:
        price = payload["chart"]["result"][0]["meta"].get("regularMarketPrice")
        return float(price) if price is not None else None
    except Exception as exc:  # noqa: BLE001
        print(f"warning: could not refresh {ticker}: {exc}", file=sys.stderr)
        return None


def replace_price_for_block(source: str, ticker: str, price: float) -> str:
    marker = f'    stock(\n      "{ticker}",'
    start = source.find(marker)
    if start == -1:
        return source
    next_start = source.find("    stock(\n", start + len(marker))
    end = next_start if next_start != -1 else source.find("\n  ]\n};", start)
    block = source[start:end]
    updated = re.sub(r"\n      ([0-9]+(?:\.[0-9]+)?),\n      \[", f"\n      {price:.2f},\n      [", block, count=1)
    return source[:start] + updated + source[end:]


def main() -> None:
    source = DATA_FILE.read_text(encoding="utf-8")
    tickers = TICKER_RE.findall(source)
    if not tickers:
        raise SystemExit("No tickers found in fallbackData.ts")

    updated = source
    refreshed = 0
    for ticker in tickers:
        price = fetch_price(ticker)
        if price is None:
            continue
        updated = replace_price_for_block(updated, ticker, price)
        refreshed += 1

    today = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    updated = DATE_RE.sub(f'generatedAt: "{today}"', updated, count=1)
    DATA_FILE.write_text(updated, encoding="utf-8")
    print(f"refreshed {refreshed}/{len(tickers)} prices at {today}")


if __name__ == "__main__":
    main()
