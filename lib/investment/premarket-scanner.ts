/**
 * Premarket / session scanners — prepare candidates before session open.
 * Does NOT execute orders; queues tickers for the trading cycle.
 *
 * Windows (Madrid):
 * - 00:30 Asia pre-scan
 * - 08:30 Europe pre-scan
 * - 14:00 USA pre-scan (FMP pre-post market)
 */

import "server-only";

import { queueTickerForCycle } from "@/lib/alerts/alert-manager";
import { isFmpEnabled } from "@/lib/market-data/fmp";
import { fetchGeneralNewsCatalysts } from "@/lib/market-data/finnhub-pro";
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
const MIN_VOLUME = 50_000;
const MAX_QUEUE = 12;

type RawMover = {
  symbol?: string;
  ticker?: string;
  price?: number;
  volume?: number;
  changesPercentage?: number;
  changePercentage?: number;
  change?: number;
};

let lastScanDayKey = "";
const ranToday = new Set<string>();

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

function queueSymbols(symbols: readonly string[]): void {
  const allow = allowed();
  let n = 0;
  for (const s of symbols) {
    const sym = s.trim().toUpperCase();
    if (!sym || !allow.has(sym)) continue;
    queueTickerForCycle(sym);
    n += 1;
    if (n >= MAX_QUEUE) break;
  }
}

async function fmpPrePostList(endpoint: string): Promise<PremarketCandidate[]> {
  if (!isFmpEnabled()) return [];
  const key = process.env["FMP_API_KEY"]?.trim();
  if (!key) return [];
  const url = `https://financialmodelingprep.com/stable/${endpoint}?apikey=${encodeURIComponent(key)}`;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) {
      console.warn(`[PreMarket] FMP ${endpoint} HTTP ${res.status}`);
      return [];
    }
    const raw = (await res.json()) as unknown;
    const rows = Array.isArray(raw) ? (raw as RawMover[]) : [];
    const out: PremarketCandidate[] = [];
    for (const row of rows) {
      const symbol = String(row.symbol ?? row.ticker ?? "")
        .trim()
        .toUpperCase();
      if (!symbol) continue;
      const gapPct = Number(
        row.changesPercentage ?? row.changePercentage ?? row.change ?? 0,
      );
      const volume = Number(row.volume ?? 0);
      const price = Number(row.price ?? 0);
      if (!(gapPct >= MIN_GAP_PCT) || !(volume >= MIN_VOLUME)) continue;
      if (!(price >= 0.75 && price <= 200)) continue;
      out.push({ symbol, gapPct, volume, price, source: endpoint });
    }
    return out.sort((a, b) => b.gapPct - a.gapPct).slice(0, 30);
  } catch (err) {
    console.warn(
      `[PreMarket] FMP ${endpoint}:`,
      err instanceof Error ? err.message : err,
    );
    return [];
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
  queueSymbols(withNews.map((c) => c.symbol));
  const top = withNews.slice(0, 8).map((c) => c.symbol);
  console.log(`[PreMarket] Europa: ${top.length} candidatos: ${top.join(", ") || "—"}`);
  return {
    session: "europe",
    candidates: withNews.slice(0, MAX_QUEUE),
    preparedOnly: true,
    at: new Date().toISOString(),
  };
}

export async function runUsaPremarketScan(): Promise<PremarketScanResult> {
  const [gainers, active] = await Promise.all([
    fmpPrePostList("pre-post-market-gainers"),
    fmpPrePostList("pre-post-market-most-active"),
  ]);
  const merged = new Map<string, PremarketCandidate>();
  for (const c of [...gainers, ...active]) {
    const prev = merged.get(c.symbol);
    if (!prev || c.gapPct > prev.gapPct) merged.set(c.symbol, c);
  }
  let candidates = [...merged.values()].sort((a, b) => b.gapPct - a.gapPct);
  candidates = await mergeNewsCatalysts(candidates);
  const allow = allowed();
  candidates = candidates.filter((c) => allow.has(c.symbol)).slice(0, MAX_QUEUE);
  queueSymbols(candidates.map((c) => c.symbol));
  const names = candidates.map((c) => c.symbol);
  console.log(
    `[PreMarket] USA: ${names.length} candidatos: ${names.join(", ") || "—"}`,
  );
  return {
    session: "usa",
    candidates,
    preparedOnly: true,
    at: new Date().toISOString(),
  };
}

/**
 * Run the matching pre-scanner once per Madrid day window.
 * Safe to call every cycle — no-ops outside windows / already-ran.
 */
export async function maybeRunPremarketScanners(): Promise<PremarketScanResult | null> {
  if (!isWeekdayMadrid()) return null;
  const day = madridDayKey();
  if (day !== lastScanDayKey) {
    lastScanDayKey = day;
    ranToday.clear();
  }
  const mins = madridMinutes();
  const h = getMadridHour();

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
  // 14:00–14:30 USA pre
  if (mins >= 840 && mins < 870 && !ranToday.has("usa")) {
    ranToday.add("usa");
    return runUsaPremarketScan();
  }
  void h;
  return null;
}
