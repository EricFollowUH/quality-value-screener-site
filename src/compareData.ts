import type { StockScore } from "./types";

const quoteMetricKeys = ["previousClose", "percentChange"] as const;

export function resolveSnapshotScores(
  tickers: string[],
  currentScores: StockScore[],
  fullMarketScores: StockScore[]
) {
  const currentByTicker = new Map(currentScores.map((stock) => [stock.ticker, stock]));
  const fullMarketByTicker = new Map(fullMarketScores.map((stock) => [stock.ticker, stock]));
  const found: StockScore[] = [];
  const missing: string[] = [];

  for (const ticker of tickers) {
    const stock = fullMarketByTicker.get(ticker) ?? currentByTicker.get(ticker);
    if (stock) found.push(stock);
    else missing.push(ticker);
  }

  return { found, missing };
}

export function mergeSnapshotQuote(snapshotStock: StockScore, liveStock: StockScore) {
  if(liveStock.modelVersion===snapshotStock.modelVersion && liveStock.dataQuality?.complete && liveStock.metrics.latestFiscalEnd===snapshotStock.metrics.latestFiscalEnd) {
    return {...snapshotStock,...liveStock,name:snapshotStock.name};
  }
  const metrics = { ...snapshotStock.metrics };
  for (const key of quoteMetricKeys) {
    const value = liveStock.metrics?.[key];
    if (value != null) metrics[key] = value;
  }

  return {
    ...snapshotStock,
    currentPrice: liveStock.currentPrice ?? snapshotStock.currentPrice,
    quoteAsOf: liveStock.quoteAsOf ?? snapshotStock.quoteAsOf,
    metrics
  };
}
