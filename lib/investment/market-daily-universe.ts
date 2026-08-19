import "server-only";

import fs from "node:fs";
import path from "node:path";
import { getTickerUniverse } from "@/lib/market-data/ticker-universe";
import { sendTelegramMessage } from "@/lib/notifications/telegram-bot";

const CACHE_DIR = path.resolve(process.cwd(), ".forgeos", "cache");
const CACHE_FILE = path.join(CACHE_DIR, "market-daily-universe.json");
const MAX_SCREENER_ROWS = 3000;
const TOP_COUNT = 100;

type ProfileRow = {
  symbol?: string;
  price?: number;
  changesPercentage?: number;
  volume?: number;
  volAvg?: number;
  yearHigh?: number;
};

type DailyTicker = {
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

type DailyUniverseCache = {
  generatedAt: string;
  nextRefreshAt: string;
  source: "fmp-screener" | "fallback-738";
  tickers: DailyTicker[];
  excludedEarnings: string[];
  sectorLeader: { etf: string; changePct: number };
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
  if (new Date(cache.nextRefreshAt).getTime() <= Date.now()) return true;
  const now = madridNowParts();
  const cacheDate = cache.generatedAt.slice(0, 10);
  const today = `${now.y}-${now.m}-${now.d}`;
  if (cacheDate !== today && now.hh >= 9) return true;
  return false;
}

async function fmpJson(pathname: string, query: Record<string, string>): Promise<unknown | null> {
  const key = process.env.FMP_API_KEY?.trim();
  if (!key) return null;
  const url = new URL(`https://financialmodelingprep.com/stable${pathname}`);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  url.searchParams.set("apikey", key);
  const res = await fetch(url.toString(), {
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) return null;
  return res.json();
}

async function fetchScreenerSymbols(): Promise<{ source: "fmp-screener" | "fallback-738"; symbols: string[] }> {
  const body = await fmpJson("/stock-screener", {
    marketCapMoreThan: "5000000",
    priceMoreThan: "0.10",
    priceLessThan: "50",
    volumeMoreThan: "100000",
    country: "US",
    exchange: "NYSE,NASDAQ,AMEX",
    limit: String(MAX_SCREENER_ROWS),
  });
  const fromFmp = Array.isArray(body)
    ? body
        .map((r) => String((r as { symbol?: string }).symbol ?? "").trim().toUpperCase())
        .filter((s) => /^[A-Z][A-Z0-9.-]{0,9}$/.test(s))
    : [];
  if (fromFmp.length > 0) return { source: "fmp-screener", symbols: [...new Set(fromFmp)] };
  const fallback = await getTickerUniverse();
  return { source: "fallback-738", symbols: fallback.tickers };
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
  const body = await fmpJson("/profile", { symbol: sectorEtfs.join(",") });
  const rows = Array.isArray(body) ? body : [];
  let best = { etf: "XLK", changePct: 0 };
  for (const row of rows) {
    const etf = String((row as { symbol?: string }).symbol ?? "");
    const cp = Number((row as { changesPercentage?: number }).changesPercentage ?? 0);
    if (Number.isFinite(cp) && cp > best.changePct) best = { etf, changePct: cp };
  }
  return best;
}

let lastMorningBriefDate = "";
let lastSpecialAlertAt = 0;

export async function refreshDailyMarketUniverse(force = false): Promise<DailyUniverseCache> {
  const cached = readCache();
  if (!force && !shouldRefresh(cached)) return cached!;

  const [{ source, symbols }, spy5d, excludedEarnings, sectorLeader] = await Promise.all([
    fetchScreenerSymbols(),
    fetchSpyMomentum5d(),
    fetchEarningsToday(),
    fetchSectorLeader(),
  ]);

  const profilesBody = await fmpJson("/profile", { symbol: symbols.slice(0, MAX_SCREENER_ROWS).join(",") });
  const profiles = Array.isArray(profilesBody) ? (profilesBody as ProfileRow[]) : [];
  const bySymbol = new Map<string, ProfileRow>();
  for (const r of profiles) {
    const s = String(r.symbol ?? "").toUpperCase();
    if (s) bySymbol.set(s, r);
  }

  const topBase = symbols
    .map((s) => {
      const p = bySymbol.get(s);
      const price = Number(p?.price ?? 0);
      const changePct = Number(p?.changesPercentage ?? 0);
      const volume = Number(p?.volume ?? 0);
      const avgVolume = Number(p?.volAvg ?? 0);
      const yearHigh = Number(p?.yearHigh ?? 0);
      if (!Number.isFinite(price) || price < 0.1 || price > 50) return null;
      if (!Number.isFinite(volume) || volume < 100_000) return null;
      const volRatio = avgVolume > 0 ? volume / avgVolume : 1;
      const dist52wHigh = yearHigh > 0 ? Math.max(0, Math.min(1, price / yearHigh)) : 0;
      // initial score before momentum refinement
      const seedScore = Math.abs(changePct) * 0.3 + volRatio * 0.2 + dist52wHigh * 0.15;
      return { symbol: s, price, changePct, volume, avgVolume, yearHigh, seedScore };
    })
    .filter((x): x is NonNullable<typeof x> => x != null)
    .sort((a, b) => b.seedScore - a.seedScore)
    .slice(0, 250);

  const momentumRows = await Promise.all(
    topBase.map(async (r) => {
      const h = await fmpJson("/historical-price-eod/full", { symbol: r.symbol });
      const rows = Array.isArray(h)
        ? h
        : Array.isArray((h as { historical?: unknown })?.historical)
          ? ((h as { historical: unknown[] }).historical ?? [])
          : [];
      const closes = rows
        .slice(0, 20)
        .map((x) => Number((x as { close?: number }).close ?? NaN))
        .filter((n) => Number.isFinite(n) && n > 0);
      const momentum5d =
        closes.length >= 6
          ? ((closes[0]! - closes[5]!) / closes[5]!) * 100
          : 0;
      const rsi14 = calcRsi14(closes.slice(0, 15));
      const relStrengthVsSpy = momentum5d - spy5d;
      const volRatio = r.avgVolume > 0 ? r.volume / r.avgVolume : 1;
      const dist52wHigh = r.yearHigh > 0 ? Math.max(0, Math.min(1, r.price / r.yearHigh)) : 0;
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
    }),
  );

  const excluded = new Set(excludedEarnings.map((s) => s.toUpperCase()));
  const finalTop = momentumRows
    .filter((t) => !excluded.has(t.symbol))
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_COUNT);

  const nextRefreshAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const payload: DailyUniverseCache = {
    generatedAt: new Date().toISOString(),
    nextRefreshAt,
    source,
    tickers: finalTop,
    excludedEarnings: [...excluded],
    sectorLeader,
  };
  writeCache(payload);

  const now = madridNowParts();
  const dateKey = `${now.y}-${now.m}-${now.d}`;
  if (now.hh === 9 && now.mm >= 5 && lastMorningBriefDate !== dateKey) {
    lastMorningBriefDate = dateKey;
    const top5 = finalTop.slice(0, 5).map((t) => `${t.symbol} (${t.score.toFixed(2)})`).join(", ");
    await sendTelegramMessage(
      `🌅 MERCADO HOY: Top 5 oportunidades del día — ${top5}\n` +
        `📅 EARNINGS HOY excluidos: ${payload.excludedEarnings.slice(0, 20).join(", ") || "ninguno"}\n` +
        `🔄 SECTOR LÍDER HOY: ${payload.sectorLeader.etf} (${payload.sectorLeader.changePct.toFixed(2)}%)`,
    );
  }

  if (Date.now() - lastSpecialAlertAt > 5 * 60 * 1000) {
    lastSpecialAlertAt = Date.now();
    const unusualVol = finalTop.find((t) => t.avgVolume > 0 && t.volume / t.avgVolume >= 5);
    if (unusualVol) {
      await sendTelegramMessage(`🔥 VOLUMEN INUSUAL: ${unusualVol.symbol} x${(unusualVol.volume / unusualVol.avgVolume).toFixed(1)} vol`);
    }
    const nearHigh = finalTop.find((t) => t.dist52wHigh >= 0.98);
    if (nearHigh) {
      await sendTelegramMessage(`📈 NEAR HIGH: ${nearHigh.symbol} a ${(100 - nearHigh.dist52wHigh * 100).toFixed(1)}% de máximo anual`);
    }
    const strongMove = finalTop.find((t) => Math.abs(t.changePct) >= 5);
    if (strongMove) {
      await sendTelegramMessage(`⚡ MOVIMIENTO FUERTE: ${strongMove.symbol} ${strongMove.changePct >= 0 ? "+" : ""}${strongMove.changePct.toFixed(1)}% hoy`);
    }
  }

  return payload;
}

export function getDailyMarketUniverse(): DailyUniverseCache | null {
  return readCache();
}
