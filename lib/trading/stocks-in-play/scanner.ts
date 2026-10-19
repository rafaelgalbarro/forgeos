import "server-only";

import fs from "node:fs";
import {
  getHistory,
  screenerExchange,
  type EodhdOpportunityRow,
} from "@/lib/market-data/eodhd";
import { getEodhdWsQuote } from "@/lib/market-data/eodhd-ws-store";
import { forgeosCacheFile } from "@/lib/trading/crypto/forgeos-cache";
import { STOCKS_IN_PLAY_MAX_LIST } from "@/lib/trading/stocks-in-play/config";
import { loadEarningsSymbolsForDay } from "@/lib/trading/stocks-in-play/earnings";
import { passesHardScreenerRow } from "@/lib/trading/stocks-in-play/filters";
import {
  estimateRvolSameTime,
  isBreakout20dHigh,
  passesMomentumBand,
  relativeStrengthVsBenchmark,
  toInPlayEntry,
  usRegularSessionElapsedFrac,
  type RankCandidate,
} from "@/lib/trading/stocks-in-play/ranking";
import { spreadPctFromBidAsk } from "@/lib/trading/stocks-in-play/cost-gate";
import { madridDayKey, saveStocksInPlayList } from "@/lib/trading/stocks-in-play/store";
import type { StocksInPlayDayList } from "@/lib/trading/stocks-in-play/types";
import { sendStocksInPlayDailyTelegram } from "@/lib/trading/stocks-in-play/telegram";
import { qualifiesAsRunner } from "@/lib/trading/stocks-in-play/runners/detect";
import { runStocksRunnersScanner } from "@/lib/trading/stocks-in-play/runners/scanner";
import { runnersSymbolSet } from "@/lib/trading/stocks-in-play/runners/store";

function loadHaltSymbols(): Set<string> {
  try {
    const p = forgeosCacheFile("us-trading-halts.json");
    if (!fs.existsSync(p)) return new Set();
    const raw = JSON.parse(fs.readFileSync(p, "utf8")) as { symbols?: string[] };
    return new Set((raw.symbols ?? []).map((s) => s.trim().toUpperCase()));
  } catch {
    return new Set();
  }
}

async function loadCandidateRows(): Promise<EodhdOpportunityRow[]> {
  const [vol, movers] = await Promise.all([
    screenerExchange({
      exchange: "US",
      minPrice: 3,
      maxPrice: 60,
      minAvgVolume: 1_000_000,
      minMarketCap: 300_000_000,
      limit: 120,
      sort: "avgvol_200d-desc",
    }),
    screenerExchange({
      exchange: "US",
      minPrice: 3,
      maxPrice: 60,
      minAvgVolume: 1_000_000,
      minMarketCap: 300_000_000,
      limit: 80,
      sort: "refund_1d_p-desc",
    }),
  ]);
  const bySym = new Map<string, EodhdOpportunityRow>();
  for (const row of [...vol, ...movers]) {
    const sym = row.symbol.trim().toUpperCase();
    if (!bySym.has(sym)) bySym.set(sym, row);
  }
  return [...bySym.values()];
}

export async function runStocksInPlayScanner(options?: {
  notifyTelegram?: boolean;
  at?: Date;
}): Promise<StocksInPlayDayList> {
  const at = options?.at ?? new Date();
  const dayKey = madridDayKey(at);
  await runStocksRunnersScanner(at);
  const runnerSyms = runnersSymbolSet(at);
  const earningsToday = await loadEarningsSymbolsForDay(dayKey);
  const rows = await loadCandidateRows();
  const elapsed = usRegularSessionElapsedFrac(at);
  const benchBars = await getHistory("SPY", 40).catch(() => []);
  const filtered: RankCandidate[] = [];

  for (const row of rows) {
    const spreadPct = (() => {
      const q = getEodhdWsQuote(row.symbol);
      return q ? spreadPctFromBidAsk(q.bid, q.ask) : undefined;
    })();
    const hard = passesHardScreenerRow(row, {
      earningsToday,
      haltSymbols: loadHaltSymbols(),
      spreadPct,
    });
    if (!hard.ok) continue;

    const dayVol = Number(row.volume ?? 0) || row.avgVolume * elapsed;
    const rvol = estimateRvolSameTime({
      dayVolume: dayVol,
      avgDailyVolume: row.avgVolume,
      sessionElapsedFrac: elapsed,
    });
    if (rvol < 2) continue;
    const sym = row.symbol.trim().toUpperCase();
    if (runnerSyms.has(sym) || qualifiesAsRunner({ changePct: row.changePct, price: row.price, rvol })) {
      continue;
    }

    const bars = await getHistory(row.symbol, 30).catch(() => []);
    const rs = relativeStrengthVsBenchmark(bars, benchBars, 20);
    const breakout = isBreakout20dHigh(bars, row.price);
    const momentum = passesMomentumBand(row.changePct);
    if (!momentum && !breakout) continue;

    const tags = [`RVOL ${rvol.toFixed(1)}×`];
    if (momentum) tags.push(`move ${row.changePct.toFixed(1)}%`);
    if (breakout) tags.push("breakout_20d");
    if (rs > 0) tags.push(`RS vs SPY +${rs.toFixed(1)}%`);

    filtered.push({ row, rvol, relStrengthSpy: rs, spreadPct, reasonTags: tags });
  }

  filtered.sort((a, b) => toInPlayEntry(b).rankScore - toInPlayEntry(a).rankScore);
  const list: StocksInPlayDayList = {
    dayKey,
    generatedAt: new Date().toISOString(),
    screened: rows.length,
    afterHardFilters: filtered.length,
    symbols: filtered.slice(0, STOCKS_IN_PLAY_MAX_LIST).map(toInPlayEntry),
  };
  saveStocksInPlayList(list);
  if (options?.notifyTelegram !== false) {
    await sendStocksInPlayDailyTelegram(list).catch(() => undefined);
  }
  return list;
}
