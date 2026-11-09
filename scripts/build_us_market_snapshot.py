#!/usr/bin/env python3
"""Build a compact weekly US stock-scoring snapshot.

The job joins three public market-wide datasets:
* SEC company ticker index for ticker-to-CIK identity.
* SEC XBRL Frames for annual fundamentals and recent balance-sheet values.
* Nasdaq's listed-company screener for names, industries, prices and market caps.

It deliberately avoids SEC's multi-gigabyte bulk archives so a scheduled CI job
can refresh the full scoreable universe in a few minutes.
"""

from __future__ import annotations

import http.cookiejar
import json
import math
import os
import re
import ssl
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "data" / "us-market-scores.json"
POLICY = json.loads((ROOT / "model-policy.json").read_text(encoding="utf-8"))
SEC_USER_AGENT = os.environ.get(
    "SEC_USER_AGENT",
    "quality-value-screener/1.0 data-pipeline@example.com",
) or "quality-value-screener/1.0 data-pipeline@example.com"
SEC_TICKERS_URL = "https://www.sec.gov/files/company_tickers_exchange.json"
SEC_FRAME_URL = "https://data.sec.gov/api/xbrl/frames/{taxonomy}/{tag}/{unit}/{frame}.json"
NASDAQ_SCREENER_URL = (
    "https://api.nasdaq.com/api/screener/stocks"
    "?tableonly=true&limit=10000&offset=0&download=true"
)
YAHOO_COOKIE_URL = "https://fc.yahoo.com/"
YAHOO_CRUMB_URL = "https://query2.finance.yahoo.com/v1/test/getcrumb"
YAHOO_QUOTE_URL = "https://query2.finance.yahoo.com/v7/finance/quote"
YAHOO_USER_AGENT = "Mozilla/5.0 QualityValueScreener/1.0"
ANNUAL_FRAMES = ("CY2025", "CY2024")
INSTANT_FRAMES = ("CY2026Q2I", "CY2025Q4I")
ALLOWED_EXCHANGES = {"Nasdaq", "NYSE", "NYSE American", "Cboe BZX"}

FLOW_FACTS = {
    "revenue": (
        "RevenueFromContractWithCustomerExcludingAssessedTax",
        "Revenues",
        "SalesRevenueNet",
    ),
    "netIncome": ("NetIncomeLoss",),
    "grossProfit": ("GrossProfit",),
    "operatingIncome": ("OperatingIncomeLoss",),
    "operatingCashflow": ("NetCashProvidedByUsedInOperatingActivities",),
    "capex": (
        "PaymentsToAcquirePropertyPlantAndEquipment",
    ),
    "capitalizedSoftware": ("PaymentsToDevelopSoftware",),
}

INSTANT_FACTS = {
    "equity": (
        "StockholdersEquity",
        "StockholdersEquityIncludingPortionAttributableToNoncontrollingInterest",
    ),
    "cash": (
        "CashAndCashEquivalentsAtCarryingValue",
        "CashCashEquivalentsRestrictedCashAndRestrictedCashEquivalents",
    ),
    "longTermDebt": (
        "LongTermDebtAndFinanceLeaseObligationsNoncurrent",
        "LongTermDebtNoncurrent",
    ),
    "currentDebt": (
        "LongTermDebtAndFinanceLeaseObligationsCurrent",
        "ShortTermBorrowings",
    ),
}

try:
    import certifi

    HTTPS_CONTEXT = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    HTTPS_CONTEXT = ssl.create_default_context()


def request_json(url: str, *, sec: bool = False, attempts: int = 4) -> dict[str, Any]:
    headers = {
        "Accept": "application/json,text/plain,*/*",
        "User-Agent": SEC_USER_AGENT if sec else (
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
            "AppleWebKit/537.36 Chrome/126.0 Safari/537.36"
        ),
    }
    if not sec:
        headers.update({"Origin": "https://www.nasdaq.com", "Referer": "https://www.nasdaq.com/"})

    for attempt in range(attempts):
        try:
            request = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(request, timeout=90, context=HTTPS_CONTEXT) as response:
                return json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            if exc.code == 404:
                return {}
            if exc.code not in {403, 429, 500, 502, 503, 504} or attempt == attempts - 1:
                raise
        except (TimeoutError, urllib.error.URLError):
            if attempt == attempts - 1:
                raise
        time.sleep(1.5 * (attempt + 1))
    return {}


def finite(value: Any) -> float | None:
    if isinstance(value, str):
        value = value.strip().replace("$", "").replace(",", "").replace("%", "")
        if not value or value.lower() in {"n/a", "na", "none", "--"}:
            return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def rounded(value: float | None) -> float | None:
    return None if value is None else round(value, 6)


def growth_rate(current: float | None, previous: float | None) -> float | None:
    if current is None or previous is None or previous <= 0:
        return None
    return (current - previous) / abs(previous)


def ratio(numerator: float | None, denominator: float | None) -> float | None:
    if numerator is None or denominator in {None, 0}:
        return None
    return numerator / denominator


def canonical_ticker(value: str) -> str:
    return value.upper().replace(".", "-").strip()


def load_sec_tickers() -> tuple[dict[str, dict[str, Any]], dict[str, str]]:
    payload = request_json(SEC_TICKERS_URL, sec=True)
    fields = payload.get("fields", [])
    indexes = {name: fields.index(name) for name in ("ticker", "cik", "name", "exchange")}
    by_ticker: dict[str, dict[str, Any]] = {}
    cik_to_ticker: dict[str, str] = {}

    for row in payload.get("data", []):
        exchange = str(row[indexes["exchange"]] or "")
        ticker = canonical_ticker(str(row[indexes["ticker"]] or ""))
        if exchange not in ALLOWED_EXCHANGES or not re.fullmatch(r"[A-Z][A-Z0-9-]{0,10}", ticker):
            continue
        cik = str(row[indexes["cik"]]).zfill(10)
        entry = {
            "ticker": ticker,
            "cik": cik,
            "name": row[indexes["name"]] or ticker,
            "exchange": exchange,
        }
        by_ticker[ticker] = entry
        cik_to_ticker.setdefault(cik, ticker)
    return by_ticker, cik_to_ticker


def load_nasdaq_rows() -> dict[str, dict[str, Any]]:
    payload = request_json(NASDAQ_SCREENER_URL)
    data = payload.get("data", {}) or {}
    rows = data.get("rows") or data.get("table", {}).get("rows", []) or []
    output: dict[str, dict[str, Any]] = {}
    for row in rows:
        ticker = canonical_ticker(str(row.get("symbol") or ""))
        price = finite(row.get("lastsale"))
        market_cap = finite(row.get("marketCap"))
        if not ticker or price is None or price <= 0 or market_cap is None or market_cap <= 0:
            continue
        output[ticker] = row
    return output


def load_yahoo_quotes(tickers: list[str]) -> dict[str, dict[str, Any]]:
    """Load current price and consensus valuation fields in bounded batches."""
    cookie_jar = http.cookiejar.CookieJar()
    opener = urllib.request.build_opener(
        urllib.request.HTTPCookieProcessor(cookie_jar),
        urllib.request.HTTPSHandler(context=HTTPS_CONTEXT),
    )
    cookie_request = urllib.request.Request(YAHOO_COOKIE_URL, headers={"User-Agent": YAHOO_USER_AGENT})
    try:
        opener.open(cookie_request, timeout=30).read()
    except urllib.error.HTTPError as exc:
        if exc.code != 404:
            raise

    crumb_request = urllib.request.Request(YAHOO_CRUMB_URL, headers={"User-Agent": YAHOO_USER_AGENT})
    with opener.open(crumb_request, timeout=30) as response:
        crumb = response.read().decode("utf-8").strip()
    if not crumb or crumb.startswith("{"):
        raise RuntimeError("Yahoo crumb was unavailable.")

    quotes: dict[str, dict[str, Any]] = {}
    for offset in range(0, len(tickers), 100):
        symbols = tickers[offset : offset + 100]
        query = urllib.parse.urlencode({"symbols": ",".join(symbols), "crumb": crumb})
        request = urllib.request.Request(
            f"{YAHOO_QUOTE_URL}?{query}",
            headers={"User-Agent": YAHOO_USER_AGENT},
        )
        with opener.open(request, timeout=45) as response:
            payload = json.loads(response.read().decode("utf-8"))
        for row in payload.get("quoteResponse", {}).get("result", []) or []:
            ticker = canonical_ticker(str(row.get("symbol") or ""))
            if ticker:
                quotes[ticker] = row
        time.sleep(0.2)
    return quotes


def frame_url(tag: str, frame: str) -> str:
    return SEC_FRAME_URL.format(
        taxonomy="us-gaap",
        tag=urllib.parse.quote(tag),
        unit="USD",
        frame=frame,
    )


def merge_frame(
    facts: dict[str, dict[str, dict[str, Any]]],
    metric: str,
    tag: str,
    frame: str,
) -> int:
    payload = request_json(frame_url(tag, frame), sec=True)
    count = 0
    for item in payload.get("data", []) or []:
        cik = str(item.get("cik") or "").zfill(10)
        value = finite(item.get("val"))
        if not cik or value is None:
            continue
        period = facts.setdefault(cik, {}).setdefault(frame, {})
        if metric in period:
            continue
        period[metric] = {"value": value, "end": item.get("end"), "tag": tag}
        count += 1
    return count


def load_sec_frames() -> dict[str, dict[str, dict[str, Any]]]:
    facts: dict[str, dict[str, dict[str, Any]]] = {}
    requests_total = sum(len(tags) for tags in FLOW_FACTS.values()) * len(ANNUAL_FRAMES)
    requests_total += sum(len(tags) for tags in INSTANT_FACTS.values()) * len(INSTANT_FRAMES)
    request_number = 0

    for frame in ANNUAL_FRAMES:
        for metric, tags in FLOW_FACTS.items():
            for tag in tags:
                request_number += 1
                added = merge_frame(facts, metric, tag, frame)
                print(f"SEC frame {request_number}/{requests_total}: {frame} {tag} ({added} added)")
                time.sleep(0.12)

    for frame in INSTANT_FRAMES:
        for metric, tags in INSTANT_FACTS.items():
            for tag in tags:
                request_number += 1
                added = merge_frame(facts, metric, tag, frame)
                print(f"SEC frame {request_number}/{requests_total}: {frame} {tag} ({added} added)")
                time.sleep(0.12)
    return facts


def classify_template(sector: str, industry: str, ticker: str = "", name: str = "") -> str:
    text = f"{sector} {industry} {ticker} {name}".lower()
    if re.search(r"video games|electronic gaming|interactive entertainment|motorsport games", text) or ("software" in industry.lower() and re.search(r"\bgames\b", name.lower())):
        return "Games / interactive entertainment"
    if "real estate" in text or "reit" in text:
        return "REITs"
    if "bank" in text:
        return "Banks"
    if "insurance" in text:
        return "Insurance"
    if any(word in text for word in ("biotech", "biotechnology", "pharmaceutical")):
        return "Biotech / drug development"
    if "utilit" in text:
        return "Utilities"
    if any(word in text for word in ("oil", "gas", "energy")):
        return "Energy / oil and gas"
    if any(word in text for word in ("semiconductor", "computer manufacturing")):
        return "Semiconductors / chip design"
    if any(word in text for word in (
        "credit services",
        "payment",
        "transaction",
        "visa inc",
        "mastercard",
        "american express",
        "paypal",
        "fiserv",
        "global payments",
        "fidelity national information",
    )):
        return "Payment networks / financial infrastructure"
    if any(word in text for word in (
        "alphabet inc",
        "google",
        "meta platforms",
        "amazon.com",
    )):
        return "AI / cloud / platform technology"
    if any(word in text for word in ("software", "computer programming", "application")):
        return "SaaS / enterprise software"
    if any(word in text for word in (
        "internet",
        "cloud",
        "interactive media",
    )):
        return "AI / cloud / platform technology"
    if any(word in text for word in ("retail", "e-commerce", "department stores")):
        return "Retail / e-commerce"
    if any(word in text for word in ("food", "beverage", "consumer defensive", "tobacco")):
        return "Consumer brands / staples"
    if any(word in text for word in ("machinery", "equipment", "manufacturing", "industrial")):
        return "Industrials / manufacturing"
    if sector.strip().lower() == "technology":
        return "AI / cloud / platform technology"
    if sector.strip().lower() in {"health care", "healthcare"}:
        return "Healthcare"
    return "General quality/value"


def clamp(score: float) -> int:
    return max(0, min(5, int(math.floor(score + 0.5))))


def score_growth(template: str, revenue_growth: float | None, earnings_growth: float | None) -> int:
    growth = revenue_growth if revenue_growth is not None else earnings_growth
    if growth is None:
        return 2
    if template in {"Consumer brands / staples", "Utilities", "Banks", "Insurance", "REITs"}:
        thresholds = (0.10, 0.06, 0.03, 0.0)
    elif template == "Payment networks / financial infrastructure":
        thresholds = (0.15, 0.08, 0.04, 0.0)
    elif template == "Energy / oil and gas":
        thresholds = (0.12, 0.06, 0.02, -0.05)
    else:
        thresholds = (0.30, 0.15, 0.07, 0.0)
    return 5 if growth >= thresholds[0] else 4 if growth >= thresholds[1] else 3 if growth >= thresholds[2] else 2 if growth >= thresholds[3] else 1


def score_quality(template: str, gross_margin: float | None, operating_margin: float | None, roe: float | None) -> int:
    if template == "Banks":
        return 3 if roe is not None and roe > 0.12 else 2 if roe is not None and roe > 0.08 else 1
    score = 0
    if gross_margin is not None:
        score += 2 if gross_margin >= 0.70 else 1 if gross_margin >= 0.40 else 0
    if operating_margin is not None:
        score += 2 if operating_margin >= 0.25 else 1 if operating_margin >= 0.10 else 0
    if roe is not None and roe >= 0.15:
        score += 1
    return clamp(score)


def score_cashflow(fcf: float | None, market_cap: float | None, revenue: float | None) -> int:
    fcf_yield = ratio(fcf, market_cap)
    fcf_margin = ratio(fcf, revenue)
    score = 1 if fcf is not None and fcf < 0 else 2
    if fcf_margin is not None:
        score = 5 if fcf_margin >= 0.20 else 4 if fcf_margin >= 0.10 else 3 if fcf_margin >= 0.03 else 1 if fcf_margin < 0 else score
    if fcf_yield is not None and fcf_yield >= 0.05:
        score = max(score, 4)
    return score


def lower_is_better(value: float | None, bands: tuple[float, float, float, float]) -> int | None:
    if value is None or value <= 0:
        return None
    return 5 if value <= bands[0] else 4 if value <= bands[1] else 3 if value <= bands[2] else 2 if value <= bands[3] else 1


def score_fcf_yield(value: float | None) -> int | None:
    if value is None:
        return None
    return 5 if value >= 0.08 else 4 if value >= 0.05 else 3 if value >= 0.03 else 2 if value >= 0.015 else 1


def weighted_score(parts: list[tuple[int | None, float]], fallback: int = 3) -> int:
    available = [(score, weight) for score, weight in parts if score is not None]
    if not available:
        return fallback
    total_weight = sum(weight for _, weight in available)
    return clamp(sum(score * weight for score, weight in available) / total_weight)


def pe_bands(template: str) -> tuple[tuple[float, float, float, float], tuple[float, float, float, float]]:
    if template in {"AI / cloud / platform technology", "SaaS / enterprise software", "Semiconductors / chip design"}:
        return (18, 25, 35, 50), (20, 30, 45, 65)
    if template in {"Consumer brands / staples", "Payment networks / financial infrastructure", "Utilities"}:
        return (13, 18, 25, 35), (15, 22, 30, 42)
    return (14, 20, 28, 40), (16, 24, 34, 50)


def score_valuation(
    template: str,
    forward_pe: float | None,
    trailing_pe: float | None,
    fcf_yield: float | None,
    price_to_book: float | None,
    market_cap: float | None,
) -> int:
    if template == "REITs":
        return 3
    if forward_pe is not None and forward_pe <= 0:
        return 2
    if market_cap is None:
        return 3
    if template in {"Banks", "Insurance"}:
        pb_bands = (0.9, 1.3, 1.8, 2.5) if template == "Banks" else (1.2, 2, 3, 4)
        return weighted_score([
            (lower_is_better(forward_pe, (10, 12, 15, 18)), 0.50),
            (lower_is_better(trailing_pe, (10, 15, 18, 21)), 0.20),
            (lower_is_better(price_to_book, pb_bands), 0.30),
        ])
    forward_bands, trailing_bands = pe_bands(template)
    weights = (0.25, 0.15, 0.60) if template == "Energy / oil and gas" else (0.60, 0.15, 0.25)
    return weighted_score([
        (lower_is_better(forward_pe, forward_bands), weights[0]),
        (lower_is_better(trailing_pe, trailing_bands), weights[1]),
        (score_fcf_yield(fcf_yield), weights[2]),
    ])


def score_risk(cash: float | None, debt: float | None, ebitda: float | None, debt_to_equity: float | None) -> int:
    if ebitda is not None and ebitda <= 0:
        return 2
    net_debt_to_ebitda = ratio((debt - cash) if debt is not None and cash is not None else None, ebitda)
    if net_debt_to_ebitda is not None:
        return 5 if net_debt_to_ebitda < 0 else 4 if net_debt_to_ebitda < 1.5 else 3 if net_debt_to_ebitda < 3 else 2 if net_debt_to_ebitda < 5 else 1
    if debt_to_equity is not None:
        return 4 if debt_to_equity < 0.5 else 3 if debt_to_equity < 1.5 else 2
    return 3


def score_sustainability(template: str, gross_margin: float | None, operating_margin: float | None, revenue_growth: float | None, roe: float | None) -> int:
    score = 3
    if template in {"AI / cloud / platform technology", "SaaS / enterprise software", "Semiconductors / chip design"}:
        score += 1
    if gross_margin is not None and gross_margin >= 0.70:
        score += 1
    if operating_margin is not None and operating_margin >= 0.25:
        score += 1
    if revenue_growth is not None and revenue_growth < 0:
        score -= 1
    if roe is not None and roe < 0:
        score -= 1
    return clamp(score)


def frame_value(facts: dict[str, dict[str, Any]], frames: tuple[str, ...], metric: str) -> tuple[float | None, str | None]:
    for frame in frames:
        item = facts.get(frame, {}).get(metric)
        if item:
            return finite(item.get("value")), item.get("end")
    return None, None


def apply_model_guardrails(template, metrics, raw_scores):
    scores = {**raw_scores, "sustainability": min(raw_scores["sustainability"], 3)}
    software = any(word in template for word in ("SaaS", "Games", "platform technology"))
    financial = template in {"Banks", "Insurance", "REITs"}
    net, op = metrics.get("netIncome"), metrics.get("operatingIncome")
    evidence = {**metrics,
        "nonOperatingShare": (net - op) / net if not financial and net is not None and net > 0 and op is not None else None,
        "equityToRevenue": ratio(metrics.get("totalEquity"), metrics.get("totalRevenue")),
        "softwareInvestmentMissing": software and metrics.get("capitalizedSoftware") is None,
    }
    flags, blocked = [], False
    for rule in POLICY["rules"]:
        if financial and rule.get("nonFinancial"):
            continue
        value, target = evidence.get(rule["field"]), rule.get("value")
        matches = value is None if rule["op"] == "missing" else value is not None and (
            value < target if rule["op"] == "lt" else value <= target if rule["op"] == "lte"
            else value > target if rule["op"] == "gt" else value == target)
        if matches:
            for key, cap in rule["caps"].items():
                scores[key] = min(scores[key], cap)
            flags.append(rule["reason"])
            blocked = blocked or rule.get("block", False)
    return {"modelVersion": POLICY["version"], "scores": scores, "flags": flags,
            "highQualityEligible": not blocked and all(scores[key] >= 3 for key in ("quality", "risk", "sustainability"))}


def score_stock(
    sec_entry: dict[str, Any],
    quote: dict[str, Any],
    yahoo_quote: dict[str, Any] | None,
    company_facts: dict[str, dict[str, Any]],
    generated_at: str,
) -> dict[str, Any] | None:
    current = company_facts.get(ANNUAL_FRAMES[0], {})
    previous = company_facts.get(ANNUAL_FRAMES[1], {})
    revenue = finite(current.get("revenue", {}).get("value"))
    net_income = finite(current.get("netIncome", {}).get("value"))
    if revenue is None:
        return None

    previous_revenue = finite(previous.get("revenue", {}).get("value"))
    previous_income = finite(previous.get("netIncome", {}).get("value"))
    gross_profit = finite(current.get("grossProfit", {}).get("value"))
    operating_income = finite(current.get("operatingIncome", {}).get("value"))
    operating_cashflow = finite(current.get("operatingCashflow", {}).get("value"))
    capex_raw = finite(current.get("capex", {}).get("value"))
    capex = abs(capex_raw) if capex_raw is not None else None
    software_raw = finite(current.get("capitalizedSoftware", {}).get("value"))
    software_investment = abs(software_raw) if software_raw is not None else None
    free_cashflow = operating_cashflow - capex - (software_investment or 0) if operating_cashflow is not None and capex is not None else None
    equity, balance_end = frame_value(company_facts, INSTANT_FRAMES, "equity")
    cash, _ = frame_value(company_facts, INSTANT_FRAMES, "cash")
    long_debt, _ = frame_value(company_facts, INSTANT_FRAMES, "longTermDebt")
    current_debt, _ = frame_value(company_facts, INSTANT_FRAMES, "currentDebt")
    debt_parts = [value for value in (long_debt, current_debt) if value is not None]
    total_debt = sum(debt_parts) if debt_parts else None

    yahoo_quote = yahoo_quote or {}
    current_price = finite(yahoo_quote.get("regularMarketPrice")) or finite(quote.get("lastsale"))
    market_cap = finite(yahoo_quote.get("marketCap")) or finite(quote.get("marketCap"))
    percent_change_raw = finite(yahoo_quote.get("regularMarketChangePercent"))
    if percent_change_raw is None:
        percent_change_raw = finite(quote.get("pctchange"))
    percent_change = percent_change_raw / 100 if percent_change_raw is not None else None
    previous_close = finite(yahoo_quote.get("regularMarketPreviousClose"))
    if previous_close is None:
        previous_close = current_price / (1 + percent_change) if current_price and percent_change not in {None, -1} else None

    revenue_growth = growth_rate(revenue, previous_revenue)
    earnings_growth = growth_rate(net_income, previous_income)
    gross_margin = ratio(gross_profit, revenue)
    operating_margin = ratio(operating_income, revenue)
    roe = ratio(net_income, equity) if equity is not None and equity > 0 else None
    forward_pe = finite(yahoo_quote.get("forwardPE"))
    trailing_pe = finite(yahoo_quote.get("trailingPE"))
    annual_pe = ratio(market_cap, net_income) if net_income is not None and net_income > 0 else None
    price_to_book = finite(yahoo_quote.get("priceToBook")) or ratio(market_cap, equity)
    fcf_yield = ratio(free_cashflow, market_cap)
    debt_to_equity = ratio(total_debt, equity)
    ebitda_proxy = operating_income if operating_income is not None else net_income

    sector = str(quote.get("sector") or "Public market")
    industry = str(quote.get("industry") or "Listed company")
    template = classify_template(sector, industry, sec_entry["ticker"], quote.get("name") or sec_entry["name"])
    growth = score_growth(template, revenue_growth, earnings_growth)
    quality = score_quality(template, gross_margin, operating_margin, roe)
    cashflow = score_cashflow(free_cashflow, market_cap, revenue)
    valuation = score_valuation(template, forward_pe, trailing_pe, fcf_yield, price_to_book, market_cap)
    risk = score_risk(cash, total_debt, ebitda_proxy, debt_to_equity)
    sustainability = score_sustainability(template, gross_margin, operating_margin, revenue_growth, roe)

    fiscal_end = current.get("revenue", {}).get("end")
    metrics = {
        "netIncome": net_income,
        "operatingIncome": operating_income,
        "totalEquity": equity,
        "capex": capex,
        "capitalizedSoftware": software_investment,
        "previousClose": previous_close,
        "percentChange": percent_change,
        "marketCap": market_cap,
        "forwardPE": forward_pe,
        "trailingPE": trailing_pe,
        "annualPE": annual_pe,
        "forwardEps": finite(yahoo_quote.get("epsForward")),
        "trailingEps": finite(yahoo_quote.get("epsTrailingTwelveMonths")),
        "priceToBook": price_to_book,
        "revenueGrowth": revenue_growth,
        "earningsGrowth": earnings_growth,
        "grossMargins": gross_margin,
        "operatingMargins": operating_margin,
        "returnOnEquity": roe,
        "freeCashflow": free_cashflow,
        "operatingCashflow": operating_cashflow,
        "totalRevenue": revenue,
        "totalCash": cash,
        "totalDebt": total_debt,
        "ebitda": ebitda_proxy,
        "debtToEquity": debt_to_equity,
        "fcfYield": fcf_yield,
        "latestFiscalEnd": fiscal_end,
        "latestBalanceEnd": balance_end,
    }

    guard = apply_model_guardrails(template, metrics, dict(growth=growth, quality=quality, cashFlow=cashflow, valuation=valuation, risk=risk, sustainability=sustainability))
    quote_time = finite(yahoo_quote.get("regularMarketTime"))
    quote_as_of = datetime.fromtimestamp(quote_time, timezone.utc).isoformat().replace("+00:00", "Z") if quote_time else generated_at
    return {
        "ticker": sec_entry["ticker"],
        "name": quote.get("name") or sec_entry["name"],
        "sector": sector,
        "industry": industry,
        "template": template,
        "exchange": sec_entry["exchange"],
        "currentPrice": round(float(current_price), 4) if current_price is not None else None,
        "quoteAsOf": quote_as_of,
        "totalScore": sum(guard["scores"].values()),
        **guard["scores"],
        "modelVersion": guard["modelVersion"],
        "reviewFlags": guard["flags"],
        "highQualityEligible": guard["highQualityEligible"],
        "reasons": {},
        "metrics": {
            key: rounded(value) if isinstance(value, (int, float)) else value
            for key, value in metrics.items()
        },
    }


def main() -> None:
    generated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    print("Loading SEC ticker index...")
    sec_tickers, cik_to_ticker = load_sec_tickers()
    print(f"Loaded {len(sec_tickers)} exchange-listed SEC tickers")
    print("Loading Nasdaq listed-company snapshot...")
    nasdaq_rows = load_nasdaq_rows()
    print(f"Loaded {len(nasdaq_rows)} Nasdaq screener rows with price and market cap")
    print("Loading Yahoo consensus valuation snapshot...")
    try:
        yahoo_quotes = load_yahoo_quotes(sorted(nasdaq_rows))
        print(f"Loaded {len(yahoo_quotes)} Yahoo quote rows with FPE and TTM P/E fields")
    except Exception as exc:
        yahoo_quotes = {}
        print(f"Yahoo valuation enrichment unavailable; using audited fallback inputs: {exc}")
    print("Loading SEC XBRL Frames...")
    facts = load_sec_frames()

    scores = []
    facts_count = 0
    joined_tickers: set[str] = set()
    for cik, company_facts in facts.items():
        ticker = cik_to_ticker.get(cik)
        if not ticker or ticker in joined_tickers:
            continue
        sec_entry = sec_tickers.get(ticker)
        quote = nasdaq_rows.get(ticker)
        if not sec_entry or not quote:
            continue
        facts_count += 1
        joined_tickers.add(ticker)
        score = score_stock(sec_entry, quote, yahoo_quotes.get(ticker), company_facts, generated_at)
        if score:
            scores.append(score)

    scores.sort(key=lambda item: (-item["totalScore"], item["ticker"]))
    priced_count = sum(1 for ticker in sec_tickers if ticker in nasdaq_rows)
    listed_count = len(sec_tickers)
    snapshot = {
        "modelVersion": POLICY["version"],
        "generatedAt": generated_at,
        "cadence": "weekly",
        "source": "全市场可评分快照 v2.0：SEC XBRL Frames 基本面 + Nasdaq 行业数据 + Yahoo FPE/TTM P/E。已应用证据与风险闸门；未覆盖的公告风险仍需人工复核。",
        "featuredTickers": [stock["ticker"] for stock in scores[:5]],
        "coverage": {
            "scope": "us-scoreable-market",
            "listedCount": listed_count,
            "factsCount": facts_count,
            "pricedCount": priced_count,
            "scoredCount": len(scores),
            "forwardPeCount": sum(1 for stock in scores if stock["metrics"].get("forwardPE") is not None),
            "trailingPeCount": sum(1 for stock in scores if stock["metrics"].get("trailingPE") is not None),
            "excludedCount": listed_count - len(scores),
        },
        "sourceDates": {
            "priceAsOf": generated_at,
            "consensusAsOf": generated_at,
            "fundamentalsAnnualFrames": list(ANNUAL_FRAMES),
            "balanceFrames": list(INSTANT_FRAMES),
        },
        "scores": scores,
    }

    if len(scores) < 1000:
        raise SystemExit(
            f"Only {len(scores)} stocks were scored; refusing to publish an incomplete market snapshot."
        )
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(snapshot, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {len(scores)} scores to {OUTPUT} at {generated_at}")


if __name__ == "__main__":
    main()
