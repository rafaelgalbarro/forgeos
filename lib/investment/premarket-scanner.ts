/**
 * Premarket / session scanners — prepare candidates before session open.
 * Does NOT execute orders; queues tickers for the trading cycle.
 *
 * Windows (Madrid):
 * - 00:30 Asia pre-scan
 * - 08:30 Europe pre-scan
 * - 14:00–14:30 USA pre-scan (IBKR scanners) — refreshes every cycle
 */

import "server-only";

import { queueTickerForCycle } from "@/lib/alerts/alert-manager";
import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { fetchGeneralNewsCatalysts } from "@/lib/market-data/finnhub-pro";
import { upsertPremarketCandidates } from "@/lib/investment/premarket-candidates";
import {
  ASIA_DIRECT_TICKERS,
  ASIA_ETF_TICKERS,
  EUROPE_DIRECT_TICKERS,
  EUROPE_ETF_TICKERS,
  getMadridHour,
} from "@/src/core/trading/market-session";
import { TRADING_CONFIG } from "@/src/core/trading/trading.config";

export type PremarketCandidate = {
  symbol: string;
  gapPct: number;
  volume: number;
  price: number;
  source: string;
};

export type PremarketScanResult = {
  session: "asia" | "europe" | "usa";
  candidates: PremarketCandidate[];
  preparedOnly: boolean;
  at: string;
};

const MIN_GAP_PCT = 1.5;
const MAX_QUEUE = 40;

let lastScanDayKey = "";
const ranToday = new Set<string>();
let lastUsaScanAtMs = 0;
const USA_SCAN_MIN_INTERVAL_MS = 55_000;

function madridDayKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function madridMinutes(): number {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

function isWeekdayMadrid(): boolean {
  const wd = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    weekday: "short",
  })
    .format(new Date())
    .toLowerCase();
  return !wd.startsWith("sat") && !wd.startsWith("sun");
}

function allowed(): Set<string> {
  return new Set(TRADING_CONFIG.allowedTickers.map((t) => t.toUpperCase()));
}

function queueSymbols(symbols: readonly string[], max = MAX_QUEUE): void {
  let n = 0;
  for (const s of symbols) {
    const sym = s.trim().toUpperCase();
    if (!sym) continue;
    queueTickerForCycle(sym);
    n += 1;
    if (n >= max) break;
  }
}

async function mergeNewsCatalysts(base: PremarketCandidate[]): Promise<PremarketCandidate[]> {
  const newsTickers = await fetchGeneralNewsCatalysts().catch(() => [] as string[]);
  const allow = allowed();
  const map = new Map(base.map((c) => [c.symbol, c]));
  for (const t of newsTickers) {
    const sym = t.toUpperCase();
    if (!allow.has(sym) || map.has(sym)) continue;
    map.set(sym, {
      symbol: sym,
      gapPct: 0,
      volume: 0,
      price: 0,
      source: "finnhub-news",
    });
  }
  return [...map.values()];
}

async function fetchIbkrPremarketRows(): Promise<PremarketCandidate[]> {
  const codes = ["TOP_PERC_GAIN", "HOT_BY_VOLUME", "MOST_ACTIVE"] as const;
  const batches = await Promise.all(
    codes.map(async (type) => {
      try {
        const res = await ibkrServiceFetch<{
          rows?: Array<{ symbol?: string; changePct?: number | null; volume?: number | null }>;
          symbols?: string[];
        }>(`/api/ibkr/scanner?type=${type}&limit=50`, { signal: AbortSignal.timeout(20_000) });
        const rows = res.rows ?? [];
        if (rows.length > 0) {
          return rows.map((r) => ({
            symbol: String(r.symbol ?? "").toUpperCase(),
            gapPct: Number(r.changePct ?? 0) || 0,
            volume: Number(r.volume ?? 0) || 0,
            price: 0,
            source: `ibkr-${type.toLowerCase()}`,
          }));
        }
        return (res.symbols ?? []).map((s) => ({
          symbol: String(s).toUpperCase(),
          gapPct: 0,
          volume: 0,
          price: 0,
          source: `ibkr-${type.toLowerCase()}`,
        }));
      } catch {
        return [] as PremarketCandidate[];
      }
    }),
  );
  return batches.flat().filter((c) => Boolean(c.symbol));
}

export async function runAsiaPremarketScan(): Promise<PremarketScanResult> {
  const seed = [...ASIA_ETF_TICKERS, ...ASIA_DIRECT_TICKERS];
  const withNews = await mergeNewsCatalysts(
    seed.map((symbol) => ({
      symbol,
      gapPct: 0,
      volume: 0,
      price: 0,
      source: "asia-universe",
    })),
  );
  queueSymbols(withNews.map((c) => c.symbol));
  const top = withNews.slice(0, 8).map((c) => c.symbol);
  console.log(`[PreMarket] Asia: ${top.length} candidatos: ${top.join(", ") || "—"}`);
  return {
    session: "asia",
    candidates: withNews.slice(0, MAX_QUEUE),
    preparedOnly: true,
    at: new Date().toISOString(),
  };
}

export async function runEuropePremarketScan(): Promise<PremarketScanResult> {
  const seed = [...EUROPE_ETF_TICKERS, ...EUROPE_DIRECT_TICKERS];
  const withNews = await mergeNewsCatalysts(
    seed.map((symbol) => ({
      symbol,
      gapPct: 0,
      volume: 0,
      price: 0,
      source: "europe-universe",
    })),
  );
  queueSymbols(withNews.map((c) => c.symbol), 60);
  const top = withNews.slice(0, 12).map((c) => c.symbol);
  console.log(`[PreMarket] Europa: ${top.length} candidatos: ${top.join(", ") || "—"}`);
  return {
    session: "europe",
    candidates: withNews.slice(0, MAX_QUEUE),
    preparedOnly: true,
    at: new Date().toISOString(),
  };
}

export async function runUsaPremarketScan(): Promise<PremarketScanResult> {
  const rows = await fetchIbkrPremarketRows();
  const merged = new Map<string, PremarketCandidate>();
  for (const row of rows) {
    if (row.gapPct !== 0 && !(row.gapPct >= MIN_GAP_PCT)) continue;
    const prev = merged.get(row.symbol);
    if (!prev || row.gapPct > prev.gapPct) {
      merged.set(row.symbol, row);
    }
  }

  let candidates = [...merged.values()].sort((a, b) => b.gapPct - a.gapPct);
  candidates = await mergeNewsCatalysts(candidates);
  const allow = allowed();
  const preferred = candidates.filter((c) => allow.has(c.symbol));
  const extras = candidates.filter((c) => !allow.has(c.symbol));
  candidates = [...preferred, ...extras].slice(0, MAX_QUEUE);

  upsertPremarketCandidates(candidates);
  queueSymbols(candidates.map((c) => c.symbol));

  const preview = candidates
    .slice(0, 8)
    .map((c) => `${c.symbol}${c.gapPct >= 0 ? "+" : ""}${c.gapPct.toFixed(1)}%`)
    .join(", ");
  console.log(`[PreMarket] IBKR ${candidates.length} candidatos: ${preview || "—"}`);

  return {
    session: "usa",
    candidates,
    preparedOnly: true,
    at: new Date().toISOString(),
  };
}

/**
 * Run matching pre-scanners. USA premarket refreshes every ~1m during 14:00–14:30.
 */
export async function maybeRunPremarketScanners(): Promise<PremarketScanResult | null> {
  if (!isWeekdayMadrid()) return null;
  const day = madridDayKey();
  if (day !== lastScanDayKey) {
    lastScanDayKey = day;
    ranToday.clear();
    lastUsaScanAtMs = 0;
  }
  const mins = madridMinutes();
  void getMadridHour();

  // 00:30–01:00 Asia pre
  if (mins >= 30 && mins < 60 && !ranToday.has("asia")) {
    ranToday.add("asia");
    return runAsiaPremarketScan();
  }
  // 08:30–09:00 Europe pre
  if (mins >= 510 && mins < 540 && !ranToday.has("europe")) {
    ranToday.add("europe");
    return runEuropePremarketScan();
  }
  // 14:00–14:30 USA pre — active every cycle (~1m)
  if (mins >= 840 && mins < 870) {
    const now = Date.now();
    if (now - lastUsaScanAtMs < USA_SCAN_MIN_INTERVAL_MS && ranToday.has("usa")) {
      return null;
    }
    lastUsaScanAtMs = now;
    ranToday.add("usa");
    return runUsaPremarketScan();
  }
  return null;
}
