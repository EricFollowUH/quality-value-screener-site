import type { StockScore } from "./types";

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
