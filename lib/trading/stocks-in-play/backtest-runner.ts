import "server-only";

import { getHistory, screenerExchange } from "@/lib/market-data/eodhd";
import { passesHardSymbolRules } from "@/lib/trading/stocks-in-play/filters";
import { passesMomentumBand } from "@/lib/trading/stocks-in-play/ranking";
import { stocksInPlayRoundTripCostPct } from "@/lib/trading/stocks-in-play/cost-gate";
import { persistStocksInPlayBacktestReport } from "@/lib/trading/stocks-in-play/live-gate";
import type { StocksInPlayBacktestReport } from "@/lib/trading/stocks-in-play/types";
import { profitFactorFromNet } from "@/lib/trading/stocks-in-play/stats";
import { STOCKS_IN_PLAY_MIN_PROFIT_FACTOR } from "@/lib/trading/stocks-in-play/config";

export async function runStocksInPlayBacktest(options?: { days?: number }): Promise<StocksInPlayBacktestReport> {
  const days = Math.min(90, Math.max(60, options?.days ?? 75));
  const netPcts: number[] = [];
  const rows = await screenerExchange({
    exchange: "US",
    minPrice: 3,
    maxPrice: 60,
    minAvgVolume: 1_000_000,
    minMarketCap: 300_000_000,
    limit: 60,
    sort: "avgvol_200d-desc",
  });

  for (const row of rows.slice(0, 25)) {
    if (!passesHardSymbolRules(row.symbol).ok) continue;
    if (!passesMomentumBand(row.changePct)) continue;
    const bars = await getHistory(row.symbol, days + 5).catch(() => []);
    for (let i = 20; i < bars.length - 1 && netPcts.length < days * 3; i++) {
      const entry = bars[i].close;
      const exit = bars[i + 1].close;
      if (!(entry > 0 && exit > 0)) continue;
      const grossPct = ((exit - entry) / entry) * 100;
      netPcts.push(grossPct - stocksInPlayRoundTripCostPct({ price: entry, qty: 1 }) * 100);
    }
  }

  const meanNetPct = netPcts.length ? netPcts.reduce((a, b) => a + b, 0) / netPcts.length : 0;
  const pf = profitFactorFromNet(netPcts);
  const report: StocksInPlayBacktestReport = {
    generatedAt: new Date().toISOString(),
    days,
    trades: netPcts.length,
    meanNetPct,
    profitFactor: pf,
    liveEligible: netPcts.length >= 20 && meanNetPct > 0 && pf > STOCKS_IN_PLAY_MIN_PROFIT_FACTOR,
    ineligibleReason:
      netPcts.length >= 20 && meanNetPct > 0 && pf > STOCKS_IN_PLAY_MIN_PROFIT_FACTOR
        ? undefined
        : `trades=${netPcts.length} mean=${meanNetPct.toFixed(3)} pf=${pf.toFixed(2)}`,
  };
  persistStocksInPlayBacktestReport(report);
  return report;
}
