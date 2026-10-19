import "server-only";

import { screenerExchange, type EodhdOpportunityRow } from "@/lib/market-data/eodhd";
import { getEodhdWsQuote } from "@/lib/market-data/eodhd-ws-store";
import { spreadPctFromBidAsk } from "@/lib/trading/stocks-in-play/cost-gate";
import {
  estimateRvolSameTime,
  usRegularSessionElapsedFrac,
} from "@/lib/trading/stocks-in-play/ranking";
import { madridDayKey } from "@/lib/trading/stocks-in-play/store";
import { RUNNERS_MAX_LIST } from "@/lib/trading/stocks-in-play/runners/config";
import { passesRunnerUniverseRow } from "@/lib/trading/stocks-in-play/runners/detect";
import { saveStocksRunnersList } from "@/lib/trading/stocks-in-play/runners/store";
import type { StocksRunnerEntry, StocksRunnersDayList } from "@/lib/trading/stocks-in-play/runners/types";

async function loadRunnerCandidateRows(): Promise<EodhdOpportunityRow[]> {
  const [gainers, pennyVol] = await Promise.all([
    screenerExchange({
      exchange: "US",
      minPrice: 1,
      maxPrice: 500,
      minAvgVolume: 200_000,
      minMarketCap: 50_000_000,
      limit: 100,
      sort: "refund_1d_p-desc",
    }),
    screenerExchange({
      exchange: "US",
      minPrice: 1,
      maxPrice: 3,
      minAvgVolume: 500_000,
      limit: 60,
      sort: "avgvol_200d-desc",
    }),
  ]);
  const bySym = new Map<string, EodhdOpportunityRow>();
  for (const row of [...gainers, ...pennyVol]) {
    const sym = row.symbol.trim().toUpperCase();
    if (!bySym.has(sym)) bySym.set(sym, row);
  }
  return [...bySym.values()];
}

export async function runStocksRunnersScanner(at: Date = new Date()): Promise<StocksRunnersDayList> {
  const dayKey = madridDayKey(at);
  const rows = await loadRunnerCandidateRows();
  const elapsed = usRegularSessionElapsedFrac(at);
  const out: StocksRunnerEntry[] = [];

  for (const row of rows) {
    const dayVol = Number(row.volume ?? 0) || row.avgVolume * elapsed;
    const rvol = estimateRvolSameTime({
      dayVolume: dayVol,
      avgDailyVolume: row.avgVolume,
      sessionElapsedFrac: elapsed,
    });
    const gate = passesRunnerUniverseRow(row, rvol);
    if (!gate.ok) continue;
    const q = getEodhdWsQuote(row.symbol);
    out.push({
      symbol: row.symbol.trim().toUpperCase(),
      reason: gate.reason,
      metrics: {
        price: row.price,
        changePct: row.changePct,
        rvol,
        spreadPct: q ? spreadPctFromBidAsk(q.bid, q.ask) : undefined,
      },
    });
  }

  out.sort((a, b) => b.metrics.changePct - a.metrics.changePct);
  const list: StocksRunnersDayList = {
    dayKey,
    generatedAt: new Date().toISOString(),
    screened: rows.length,
    symbols: out.slice(0, RUNNERS_MAX_LIST),
  };
  saveStocksRunnersList(list);
  return list;
}
