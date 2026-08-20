import "server-only";

import fs from "node:fs";
import path from "node:path";
import { getBatchQuotes } from "@/lib/market-data/fmp";
import { getTickerUniverse } from "@/lib/market-data/ticker-universe";
import { sendTelegramMessage } from "@/lib/notifications/telegram-bot";

const CACHE_DIR = path.resolve(process.cwd(), ".forgeos", "cache");
const CACHE_FILE = path.join(CACHE_DIR, "market-daily-universe.json");
const MAX_SCREENER_ROWS = 3000;
const TOP_COUNT = 100;
const HISTORY_CONCURRENCY = 8;
const HISTORY_CANDIDATES = 120;

export type DailyTicker = {
  symbol: string;
  price: number;
  changePct: number;
  volume: number;
  avgVolume: number;
  momentum5d: number;
  relStrengthVsSpy: number;
  dist52wHigh: number;
  rsi14: number;
  score: number;
  category: "Top Gainers" | "Top Volume" | "Momentum" | "Oversold" | "Near 52w High" | "General";
};

export type DailyUniverseCache = {
  generatedAt: string;
  nextRefreshAt: string;
  source: "fmp-screener" | "fallback-738";
  screenerCount: number;
  tickers: DailyTicker[];
  excludedEarnings: string[];
  sectorLeader: { etf: string; changePct: number };
};

type ScreenerRow = {
  symbol: string;
  price: number;
  changePct: number;
  volume: number;
  avgVolume: number;
  yearHigh: number;
  marketCap: number;
};

function readCache(): DailyUniverseCache | null {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")) as DailyUniverseCache;
  } catch {
    return null;
  }
}

function writeCache(payload: DailyUniverseCache): void {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(payload, null, 2), "utf8");
}

function madridNowParts(): { y: string; m: string; d: string; hh: number; mm: number } {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const y = p.find((x) => x.type === "year")?.value ?? "2026";
  const m = p.find((x) => x.type === "month")?.value ?? "01";
  const d = p.find((x) => x.type === "day")?.value ?? "01";
  const hh = Number(p.find((x) => x.type === "hour")?.value ?? "0");
  const mm = Number(p.find((x) => x.type === "minute")?.value ?? "0");
  return { y, m, d, hh, mm };
}

function shouldRefresh(cache: DailyUniverseCache | null): boolean {
  if (!cache) return true;
  if (!Array.isArray(cache.tickers) || cache.tickers.length === 0) return true;
  if (new Date(cache.nextRefreshAt).getTime() <= Date.now()) return true;
  const now = madridNowParts();
  const cacheDate = (cache.generatedAt ?? "").slice(0, 10);
  const today = `${now.y}-${now.m}-${now.d}`;
  if (cacheDate !== today && now.hh >= 9) return true;
  return false;
}

async function fmpJson(pathname: string, query: Record<string, string>): Promise<unknown | null> {
  const key = process.env.FMP_API_KEY?.trim();
  if (!key) {
    console.warn("[Universe] FMP_API_KEY no configurada");
    return null;
  }
  const url = new URL(`https://financialmodelingprep.com/stable${pathname}`);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  url.searchParams.set("apikey", key);
  const res = await fetch(url.toString(), {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(45_000),
  });
  if (!res.ok) {
    console.warn(`[Universe] FMP ${pathname} HTTP ${res.status}`);
    return null;
  }
  return res.json();
}

function parseScreenerRows(body: unknown): ScreenerRow[] {
  if (!Array.isArray(body)) return [];
  const out: ScreenerRow[] = [];
  for (const raw of body) {
    const r = raw as Record<string, unknown>;
    const symbol = String(r.symbol ?? "").trim().toUpperCase();
    if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol)) continue;
    const price = Number(r.price ?? 0);
    const changePct = Number(
      r.changesPercentage ?? r.changePercentage ?? r.change ?? r.priceChangePercentage ?? 0,
    );
    const volume = Number(r.volume ?? r.volAvg ?? 0);
    const avgVolume = Number(r.avgVolume ?? r.volAvg ?? volume ?? 0);
    const yearHigh = Number(r.yearHigh ?? r.price ?? 0);
    const marketCap = Number(r.marketCap ?? 0);
    if (!Number.isFinite(price) || price < 0.1 || price > 50) continue;
    if (!Number.isFinite(volume) || volume < 100_000) continue;
    out.push({
      symbol,
      price,
      changePct: Number.isFinite(changePct) ? changePct : 0,
      volume,
      avgVolume: Number.isFinite(avgVolume) && avgVolume > 0 ? avgVolume : volume,
      yearHigh: Number.isFinite(yearHigh) && yearHigh > 0 ? yearHigh : price,
      marketCap: Number.isFinite(marketCap) ? marketCap : 0,
    });
  }
  return out;
}

async function fetchScreenerRows(): Promise<{
  source: "fmp-screener" | "fallback-738";
  rows: ScreenerRow[];
  screenerCount: number;
}> {
  console.log("[Universe] Cargando screener FMP...");
  const body = await fmpJson("/stock-screener", {
    marketCapMoreThan: "5000000",
    priceMoreThan: "0.10",
    priceLessThan: "50",
    volumeMoreThan: "100000",
    country: "US",
    exchange: "NYSE,NASDAQ,AMEX",
    limit: String(MAX_SCREENER_ROWS),
  });
  const fromFmp = parseScreenerRows(body);
  if (fromFmp.length > 0) {
    console.log(`[Universe] Screener FMP OK: ${fromFmp.length} filas`);
    return { source: "fmp-screener", rows: fromFmp, screenerCount: fromFmp.length };
  }

  console.warn("[Universe] Screener FMP vacío/falló — usando fallback universo");
  const fallback = await getTickerUniverse();
  const symbols = fallback.tickers.slice(0, 800);
  const quotes = await getBatchQuotes(symbols);
  const rows: ScreenerRow[] = [];
  for (const symbol of symbols) {
    const q = quotes.get(symbol);
    if (!q || q.price < 0.1 || q.price > 50) continue;
    if ((q.volume ?? 0) < 100_000 && (q.avgVolume ?? 0) < 100_000) continue;
    rows.push({
      symbol,
      price: q.price,
      changePct: q.changePercentage ?? 0,
      volume: q.volume ?? 0,
      avgVolume: q.avgVolume ?? q.volume ?? 0,
      yearHigh: q.yearHigh ?? q.price,
      marketCap: q.marketCap ?? 0,
    });
  }
  return { source: "fallback-738", rows, screenerCount: symbols.length };
}

async function fetchSpyMomentum5d(): Promise<number> {
  const hist = await fmpJson("/historical-price-eod/full", { symbol: "SPY" });
  const rows = Array.isArray(hist)
    ? hist
    : Array.isArray((hist as { historical?: unknown })?.historical)
      ? ((hist as { historical: unknown[] }).historical ?? [])
      : [];
  const closes = rows
    .slice(0, 6)
    .map((r) => Number((r as { close?: number }).close ?? NaN))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (closes.length < 2) return 0;
  const first = closes[closes.length - 1]!;
  const last = closes[0]!;
  return ((last - first) / first) * 100;
}

function pickCategory(t: DailyTicker): DailyTicker["category"] {
  if (t.rsi14 > 0 && t.rsi14 < 30) return "Oversold";
  if (t.changePct >= 3) return "Top Gainers";
  const volRatio = t.avgVolume > 0 ? t.volume / t.avgVolume : 0;
  if (volRatio >= 2) return "Top Volume";
  if (t.momentum5d >= 5) return "Momentum";
  if (t.dist52wHigh >= 0.98) return "Near 52w High";
  return "General";
}

function calcRsi14(closesDesc: number[]): number {
  if (closesDesc.length < 15) return 0;
  const closes = [...closesDesc].reverse();
  let gains = 0;
  let losses = 0;
  for (let i = 1; i < closes.length; i += 1) {
    const d = closes[i]! - closes[i - 1]!;
    if (d > 0) gains += d;
    else losses += Math.abs(d);
  }
  const avgGain = gains / 14;
  const avgLoss = losses / 14;
  if (avgLoss <= 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

async function fetchEarningsToday(): Promise<string[]> {
  const { y, m, d } = madridNowParts();
  const today = `${y}-${m}-${d}`;
  const body = await fmpJson("/earning-calendar-confirmed", { from: today, to: today });
  if (!Array.isArray(body)) return [];
  return [...new Set(body.map((r) => String((r as { symbol?: string }).symbol ?? "").toUpperCase()).filter(Boolean))];
}

async function fetchSectorLeader(): Promise<{ etf: string; changePct: number }> {
  const sectorEtfs = ["XLK", "XLF", "XLE", "XLV", "XLI", "XLY"];
  const quotes = await getBatchQuotes(sectorEtfs);
  let best = { etf: "XLK", changePct: 0 };
  for (const etf of sectorEtfs) {
    const cp = quotes.get(etf)?.changePercentage ?? 0;
    if (Number.isFinite(cp) && cp > best.changePct) best = { etf, changePct: cp };
  }
  return best;
}

async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let idx = 0;
  async function worker(): Promise<void> {
    while (idx < items.length) {
      const i = idx++;
      out[i] = await fn(items[i]!);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, limit) }, () => worker()));
  return out;
}

function seedScore(r: ScreenerRow): number {
  const volRatio = r.avgVolume > 0 ? r.volume / r.avgVolume : 1;
  const dist52wHigh = r.yearHigh > 0 ? Math.max(0, Math.min(1, r.price / r.yearHigh)) : 0;
  return Math.abs(r.changePct) * 0.3 + volRatio * 0.2 + dist52wHigh * 0.15;
}

function tickerFromSeed(r: ScreenerRow, spy5d: number, momentum5d = 0, rsi14 = 0): DailyTicker {
  const volRatio = r.avgVolume > 0 ? r.volume / r.avgVolume : 1;
  const dist52wHigh = r.yearHigh > 0 ? Math.max(0, Math.min(1, r.price / r.yearHigh)) : 0;
  const relStrengthVsSpy = momentum5d - spy5d;
  const score =
    Math.abs(r.changePct) * 0.3 +
    volRatio * 0.2 +
    momentum5d * 0.2 +
    relStrengthVsSpy * 0.15 +
    dist52wHigh * 0.15;
  const t: DailyTicker = {
    symbol: r.symbol,
    price: r.price,
    changePct: r.changePct,
    volume: r.volume,
    avgVolume: r.avgVolume,
    momentum5d,
    relStrengthVsSpy,
    dist52wHigh,
    rsi14,
    score,
    category: "General",
  };
  t.category = pickCategory(t);
  return t;
}

let lastMorningBriefDate = "";
let lastSpecialAlertAt = 0;
let refreshInFlight: Promise<DailyUniverseCache> | null = null;

export async function refreshDailyMarketUniverse(force = false): Promise<DailyUniverseCache> {
  const cached = readCache();
  if (!force && !shouldRefresh(cached) && cached) {
    return cached;
  }
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const [{ source, rows, screenerCount }, spy5d, excludedEarnings, sectorLeader] = await Promise.all([
        fetchScreenerRows(),
        fetchSpyMomentum5d().catch(() => 0),
        fetchEarningsToday().catch(() => [] as string[]),
        fetchSectorLeader().catch(() => ({ etf: "XLK", changePct: 0 })),
      ]);

      const ranked = [...rows].sort((a, b) => seedScore(b) - seedScore(a));
      const candidates = ranked.slice(0, HISTORY_CANDIDATES);

      const enriched = await mapWithConcurrency(candidates, HISTORY_CONCURRENCY, async (r) => {
        try {
          const h = await fmpJson("/historical-price-eod/full", { symbol: r.symbol });
          const histRows = Array.isArray(h)
            ? h
            : Array.isArray((h as { historical?: unknown })?.historical)
              ? ((h as { historical: unknown[] }).historical ?? [])
              : [];
          const closes = histRows
            .slice(0, 20)
            .map((x) => Number((x as { close?: number }).close ?? NaN))
            .filter((n) => Number.isFinite(n) && n > 0);
          const momentum5d =
            closes.length >= 6 ? ((closes[0]! - closes[5]!) / closes[5]!) * 100 : 0;
          const rsi14 = calcRsi14(closes.slice(0, 15));
          return tickerFromSeed(r, spy5d, momentum5d, rsi14);
        } catch {
          return tickerFromSeed(r, spy5d, 0, 0);
        }
      });

      const excluded = new Set(excludedEarnings.map((s) => s.toUpperCase()));
      let finalTop = enriched
        .filter((t) => !excluded.has(t.symbol))
        .sort((a, b) => b.score - a.score)
        .slice(0, TOP_COUNT);

      // Never persist an empty TOP if screener had rows — keep seed-scored fallback.
      if (finalTop.length === 0 && ranked.length > 0) {
        finalTop = ranked
          .filter((r) => !excluded.has(r.symbol))
          .slice(0, TOP_COUNT)
          .map((r) => tickerFromSeed(r, spy5d, 0, 0));
      }

      const nextRefreshAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const payload: DailyUniverseCache = {
        generatedAt: new Date().toISOString(),
        nextRefreshAt,
        source,
        screenerCount,
        tickers: finalTop,
        excludedEarnings: [...excluded],
        sectorLeader,
      };

      if (finalTop.length > 0) {
        writeCache(payload);
        const preview = finalTop
          .slice(0, 12)
          .map((t) => t.symbol)
          .join(", ");
        console.log(`[Universe] TOP ${finalTop.length} cargados: ${preview}${finalTop.length > 12 ? "..." : ""}`);
      } else {
        console.error("[Universe] TOP 100 vacío tras screener — no se sobrescribe caché buena");
        if (cached && cached.tickers.length > 0) return cached;
      }

      const now = madridNowParts();
      const dateKey = `${now.y}-${now.m}-${now.d}`;
      if (finalTop.length > 0 && now.hh === 9 && now.mm >= 5 && lastMorningBriefDate !== dateKey) {
        lastMorningBriefDate = dateKey;
        const top5 = finalTop.slice(0, 5).map((t) => `${t.symbol} (${t.score.toFixed(2)})`).join(", ");
        await sendTelegramMessage(
          `🌅 MERCADO HOY: Top 5 oportunidades del día — ${top5}\n` +
            `📅 EARNINGS HOY excluidos: ${payload.excludedEarnings.slice(0, 20).join(", ") || "ninguno"}\n` +
            `🔄 SECTOR LÍDER HOY: ${payload.sectorLeader.etf} (${payload.sectorLeader.changePct.toFixed(2)}%)`,
        );
      }

      if (finalTop.length > 0 && Date.now() - lastSpecialAlertAt > 5 * 60 * 1000) {
        lastSpecialAlertAt = Date.now();
        const unusualVol = finalTop.find((t) => t.avgVolume > 0 && t.volume / t.avgVolume >= 5);
        if (unusualVol) {
          await sendTelegramMessage(
            `🔥 VOLUMEN INUSUAL: ${unusualVol.symbol} x${(unusualVol.volume / unusualVol.avgVolume).toFixed(1)} vol`,
          );
        }
        const nearHigh = finalTop.find((t) => t.dist52wHigh >= 0.98);
        if (nearHigh) {
          await sendTelegramMessage(
            `📈 NEAR HIGH: ${nearHigh.symbol} a ${(100 - nearHigh.dist52wHigh * 100).toFixed(1)}% de máximo anual`,
          );
        }
        const strongMove = finalTop.find((t) => Math.abs(t.changePct) >= 5);
        if (strongMove) {
          await sendTelegramMessage(
            `⚡ MOVIMIENTO FUERTE: ${strongMove.symbol} ${strongMove.changePct >= 0 ? "+" : ""}${strongMove.changePct.toFixed(1)}% hoy`,
          );
        }
      }

      return payload;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export function getDailyMarketUniverse(): DailyUniverseCache | null {
  return readCache();
}

/** Alias used by cycle-universe / API. */
export function getDailyUniverse(): DailyUniverseCache | null {
  return getDailyMarketUniverse();
}

/** Ensure cache is loaded (force if empty). */
export async function ensureDailyUniverse(): Promise<DailyUniverseCache> {
  const cached = readCache();
  if (!cached || cached.tickers.length === 0) {
    return refreshDailyMarketUniverse(true);
  }
  return refreshDailyMarketUniverse(false);
}
