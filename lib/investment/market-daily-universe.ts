import "server-only";

import fs from "node:fs";
import path from "node:path";
import { getBatchQuotes } from "@/lib/market-data/fmp";
import { getTickerUniverse } from "@/lib/market-data/ticker-universe";
import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import {
  ASIA_DIRECT_TICKERS,
  ASIA_ETF_TICKERS,
  EUROPE_DIRECT_TICKERS,
  EUROPE_ETF_TICKERS,
  getGlobalMarketWindow,
} from "@/src/core/trading/market-session";
import { IBKR_CRYPTO_TICKERS, ensureCryptoInTickerList, verifyCryptoTradingStatus } from "@/src/core/trading/crypto-ibkr";

const CACHE_DIR = path.resolve(process.cwd(), ".forgeos", "cache");
const CACHE_FILE = path.join(CACHE_DIR, "market-daily-universe.json");
const TOP_COUNT = 100;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const HISTORY_CONCURRENCY = 3;
const HISTORY_CANDIDATES = 80;

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
  sources: string[];
};

export type DailyUniverseCache = {
  generatedAt: string;
  nextRefreshAt: string;
  source: "multi-source" | "fmp-movers" | "ibkr-scanner" | "fallback-738";
  screenerCount: number;
  sourcesUsed: string[];
  tickers: DailyTicker[];
  excludedEarnings: string[];
  sectorLeader: { etf: string; changePct: number };
};

type SeedRow = {
  symbol: string;
  price: number;
  changePct: number;
  volume: number;
  avgVolume: number;
  yearHigh: number;
  sources: string[];
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
  return {
    y: p.find((x) => x.type === "year")?.value ?? "2026",
    m: p.find((x) => x.type === "month")?.value ?? "01",
    d: p.find((x) => x.type === "day")?.value ?? "01",
    hh: Number(p.find((x) => x.type === "hour")?.value ?? "0"),
    mm: Number(p.find((x) => x.type === "minute")?.value ?? "0"),
  };
}

function shouldRefresh(cache: DailyUniverseCache | null): boolean {
  if (!cache) return true;
  if (!Array.isArray(cache.tickers) || cache.tickers.length === 0) return true;
  if (new Date(cache.nextRefreshAt).getTime() <= Date.now()) return true;
  return false;
}

async function fmpJson(pathname: string, query: Record<string, string> = {}): Promise<unknown | null> {
  const key = process.env.FMP_API_KEY?.trim();
  if (!key) return null;
  const url = new URL(`https://financialmodelingprep.com/stable${pathname}`);
  for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  url.searchParams.set("apikey", key);
  try {
    const res = await fetch(url.toString(), {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) {
      console.warn(`[Universe] FMP ${pathname} HTTP ${res.status}`);
      return null;
    }
    return res.json();
  } catch (err) {
    console.warn(`[Universe] FMP ${pathname} failed:`, err instanceof Error ? err.message : err);
    return null;
  }
}

function asSymbol(raw: unknown): string {
  const s = String(raw ?? "").trim().toUpperCase();
  return /^[A-Z][A-Z0-9.-]{0,9}$/.test(s) ? s : "";
}

function parseMoverRows(body: unknown, source: string): SeedRow[] {
  if (!Array.isArray(body)) return [];
  const out: SeedRow[] = [];
  for (const raw of body) {
    const r = raw as Record<string, unknown>;
    const symbol = asSymbol(r.symbol);
    if (!symbol) continue;
    const price = Number(r.price ?? r.lastPrice ?? 0);
    const changePct = Number(r.changesPercentage ?? r.changePercentage ?? r.change ?? 0);
    const volume = Number(r.volume ?? 0);
    const avgVolume = Number(r.avgVolume ?? r.volAvg ?? volume ?? 0);
    const yearHigh = Number(r.yearHigh ?? price);
    out.push({
      symbol,
      price: Number.isFinite(price) ? price : 0,
      changePct: Number.isFinite(changePct) ? changePct : 0,
      volume: Number.isFinite(volume) ? volume : 0,
      avgVolume: Number.isFinite(avgVolume) && avgVolume > 0 ? avgVolume : volume || 0,
      yearHigh: Number.isFinite(yearHigh) && yearHigh > 0 ? yearHigh : price || 0,
      sources: [source],
    });
  }
  return out;
}

/** Crypto spot IBKR (PAXOS) — siempre en el universo, mercado 24h. */
async function fetchCryptoSeeds(): Promise<SeedRow[]> {
  const unique = [...IBKR_CRYPTO_TICKERS];
  console.log(`[Universe] Crypto 24h IBKR (${unique.join(", ")})`);
  const quotes = await getBatchQuotes(unique);
  return unique.map((symbol) => {
    const q = quotes.get(symbol);
    return {
      symbol,
      price: q?.price ?? 0,
      changePct: q?.changePercentage ?? 0,
      volume: q?.volume ?? 0,
      avgVolume: q?.avgVolume ?? q?.volume ?? 0,
      yearHigh: q?.yearHigh ?? q?.price ?? 0,
      sources: ["ibkr-crypto-paxos"],
    };
  });
}
async function fetchRegionalEtfSeeds(): Promise<SeedRow[]> {
  const w = getGlobalMarketWindow();
  const symbols: string[] = [];
  if (w.asia) symbols.push(...ASIA_ETF_TICKERS, ...ASIA_DIRECT_TICKERS);
  if (w.europe) symbols.push(...EUROPE_ETF_TICKERS, ...EUROPE_DIRECT_TICKERS);
  if (symbols.length === 0) return [];
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
  console.log(`[Universe] FMP profile regional ETFs (${unique.join(", ")})`);
  const quotes = await getBatchQuotes(unique);
  return unique.map((symbol) => {
    const q = quotes.get(symbol);
    return {
      symbol,
      price: q?.price ?? 0,
      changePct: q?.changePercentage ?? 0,
      volume: q?.volume ?? 0,
      avgVolume: q?.avgVolume ?? q?.volume ?? 0,
      yearHigh: q?.yearHigh ?? q?.price ?? 0,
      sources: ["fmp-profile-regional"],
    };
  });
}

/** FUENTE 1 — FMP gainers / losers / most-active (Starter). */
async function fetchFmpMovers(): Promise<SeedRow[]> {
  console.log("[Universe] Cargando FMP movers (gainers/losers/active)...");
  const [gainers, losers, active] = await Promise.all([
    fmpJson("/market-biggest-gainers"),
    fmpJson("/market-biggest-losers"),
    fmpJson("/market-most-active"),
  ]);
  const rows = [
    ...parseMoverRows(gainers, "fmp-gainers"),
    ...parseMoverRows(losers, "fmp-losers"),
    ...parseMoverRows(active, "fmp-active"),
  ];
  console.log(`[Universe] FMP movers: ${rows.length} filas`);
  return rows;
}

/** FUENTE 2 — IBKR scanner TOP_PERC_GAIN / LOSE / MOST_ACTIVE. */
async function fetchIbkrScanner(): Promise<SeedRow[]> {
  console.log("[Universe] Cargando IBKR scanner...");
  const types = ["TOP_PERC_GAIN", "TOP_PERC_LOSE", "MOST_ACTIVE"] as const;
  const batches = await Promise.all(
    types.map(async (type) => {
      try {
        const res = await ibkrServiceFetch<{
          ok?: boolean;
          rows?: Array<{ symbol?: string; changePct?: number | null; volume?: number | null }>;
          symbols?: string[];
        }>(`/api/ibkr/scanner?type=${type}&limit=50`, { signal: AbortSignal.timeout(25_000) });
        const rows = res.rows ?? [];
        if (rows.length > 0) {
          return rows.map((r) => ({
            symbol: asSymbol(r.symbol),
            price: 0,
            changePct: Number(r.changePct ?? 0) || 0,
            volume: Number(r.volume ?? 0) || 0,
            avgVolume: Number(r.volume ?? 0) || 0,
            yearHigh: 0,
            sources: [`ibkr-${type.toLowerCase()}`],
          })).filter((r) => r.symbol);
        }
        return (res.symbols ?? [])
          .map((s) => asSymbol(s))
          .filter(Boolean)
          .map((symbol) => ({
            symbol,
            price: 0,
            changePct: 0,
            volume: 0,
            avgVolume: 0,
            yearHigh: 0,
            sources: [`ibkr-${type.toLowerCase()}`],
          }));
      } catch (err) {
        console.warn(`[Universe] IBKR scanner ${type} failed:`, err instanceof Error ? err.message : err);
        return [] as SeedRow[];
      }
    }),
  );
  const flat = batches.flat();
  console.log(`[Universe] IBKR scanner: ${flat.length} filas`);
  return flat;
}

/** FUENTE 3 — Fallback universo ~738. */
async function fetchFallbackUniverse(): Promise<SeedRow[]> {
  console.log("[Universe] Cargando fallback 738...");
  try {
    const universe = await getTickerUniverse();
    return universe.tickers.slice(0, 800).map((symbol) => ({
      symbol: symbol.toUpperCase(),
      price: 0,
      changePct: 0,
      volume: 0,
      avgVolume: 0,
      yearHigh: 0,
      sources: ["fallback-738"],
    }));
  } catch (err) {
    console.warn("[Universe] Fallback failed:", err instanceof Error ? err.message : err);
    return [];
  }
}

/** FUENTE 4 — Posiciones abiertas IBKR. */
async function fetchOpenPositions(): Promise<SeedRow[]> {
  try {
    const positions = await ibkrServiceFetch<
      Array<{ symbol?: string; position?: number }>
    >("/api/ibkr/positions");
    return (positions ?? [])
      .filter((p) => Math.abs(Number(p.position ?? 0)) > 0)
      .map((p) => asSymbol(p.symbol))
      .filter(Boolean)
      .map((symbol) => ({
        symbol,
        price: 0,
        changePct: 0,
        volume: 0,
        avgVolume: 0,
        yearHigh: 0,
        sources: ["portfolio"],
      }));
  } catch {
    return [];
  }
}

function mergeSeeds(batches: SeedRow[][]): SeedRow[] {
  const map = new Map<string, SeedRow>();
  for (const batch of batches) {
    for (const row of batch) {
      if (!row.symbol) continue;
      const prev = map.get(row.symbol);
      if (!prev) {
        map.set(row.symbol, { ...row, sources: [...row.sources] });
        continue;
      }
      map.set(row.symbol, {
        symbol: row.symbol,
        price: row.price > 0 ? row.price : prev.price,
        changePct: row.changePct !== 0 ? row.changePct : prev.changePct,
        volume: Math.max(row.volume, prev.volume),
        avgVolume: Math.max(row.avgVolume, prev.avgVolume),
        yearHigh: row.yearHigh > 0 ? row.yearHigh : prev.yearHigh,
        sources: [...new Set([...prev.sources, ...row.sources])],
      });
    }
  }
  return [...map.values()];
}

async function enrichWithQuotes(seeds: SeedRow[]): Promise<SeedRow[]> {
  const needQuote = seeds.filter((s) => !(s.price > 0) || !(s.volume > 0)).map((s) => s.symbol);
  if (needQuote.length === 0) return seeds;
  // Cap profile enrichment to avoid 429 — prioritize movers without price.
  const toFetch = needQuote.slice(0, 150);
  console.log(`[Universe] Enriching ${toFetch.length} symbols via FMP profile (rate-limited)...`);
  const quotes = await getBatchQuotes(toFetch);
  return seeds.map((s) => {
    const q = quotes.get(s.symbol);
    if (!q) return s;
    return {
      ...s,
      price: s.price > 0 ? s.price : q.price,
      changePct: s.changePct !== 0 ? s.changePct : q.changePercentage ?? 0,
      volume: s.volume > 0 ? s.volume : q.volume ?? 0,
      avgVolume: s.avgVolume > 0 ? s.avgVolume : q.avgVolume ?? q.volume ?? 0,
      yearHigh: s.yearHigh > 0 ? s.yearHigh : q.yearHigh ?? q.price,
    };
  });
}

function passesFilters(r: SeedRow, forceKeep: Set<string>): boolean {
  if (forceKeep.has(r.symbol)) return true;
  if (!(r.price >= 0.1 && r.price <= 50)) return false;
  if (r.volume > 0 && r.volume < 100_000 && r.avgVolume < 100_000) return false;
  // Allow IBKR/FMP movers with unknown volume yet (price filter still applies when known).
  if (r.price <= 0) return r.sources.some((s) => s.startsWith("ibkr-") || s.startsWith("fmp-"));
  return true;
}

function seedScore(r: SeedRow): number {
  const volRatio = r.avgVolume > 0 ? r.volume / r.avgVolume : 1;
  const dist52wHigh = r.yearHigh > 0 ? Math.max(0, Math.min(1, r.price / r.yearHigh)) : 0;
  const sourceBoost = r.sources.includes("portfolio")
    ? 5
    : r.sources.some((s) => s.startsWith("fmp-") || s.startsWith("ibkr-"))
      ? 2
      : 0;
  return Math.abs(r.changePct) * 0.3 + volRatio * 0.2 + dist52wHigh * 0.15 + sourceBoost;
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

async function fetchSpyMomentum5d(): Promise<number> {
  // No historical endpoint on Starter — use SPY profile change% as proxy.
  const body = await fmpJson("/profile", { symbol: "SPY" });
  const row = Array.isArray(body) ? body[0] : body;
  if (!row || typeof row !== "object") return 0;
  const cp = Number(
    (row as { changesPercentage?: number; changePercentage?: number }).changesPercentage ??
      (row as { changePercentage?: number }).changePercentage ??
      0,
  );
  return Number.isFinite(cp) ? cp : 0;
}

async function fetchEarningsToday(): Promise<string[]> {
  const { y, m, d } = madridNowParts();
  const today = `${y}-${m}-${d}`;
  const body = await fmpJson("/earning-calendar-confirmed", { from: today, to: today });
  if (!Array.isArray(body)) return [];
  return [...new Set(body.map((r) => asSymbol((r as { symbol?: string }).symbol)).filter(Boolean))];
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

function tickerFromSeed(
  r: SeedRow,
  spy5d: number,
  momentum5d = 0,
  rsi14 = 0,
): DailyTicker {
  const volRatio = r.avgVolume > 0 ? r.volume / r.avgVolume : 1;
  const dist52wHigh = r.yearHigh > 0 ? Math.max(0, Math.min(1, r.price / r.yearHigh)) : 0;
  const relStrengthVsSpy = momentum5d - spy5d;
  const score =
    Math.abs(r.changePct) * 0.3 +
    volRatio * 0.2 +
    momentum5d * 0.2 +
    relStrengthVsSpy * 0.15 +
    dist52wHigh * 0.15 +
    (r.sources.includes("portfolio") ? 5 : 0);
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
    sources: r.sources,
  };
  t.category = pickCategory(t);
  return t;
}

let lastMorningBriefDate = "";
let lastSpecialAlertAt = 0;
let refreshInFlight: Promise<DailyUniverseCache> | null = null;

export async function refreshDailyMarketUniverse(force = false): Promise<DailyUniverseCache> {
  const cached = readCache();
  if (!force && !shouldRefresh(cached) && cached) return cached;
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      console.log("[Universe] Cargando screener multi-fuente (FMP movers + crypto 24h + regional profile + IBKR + fallback + portfolio)...");
      const window = getGlobalMarketWindow();
      const [fmpMovers, cryptoRows, regionalRows, ibkrRows, fallbackRows, portfolioRows, spy5d, excludedEarnings, sectorLeader] =
        await Promise.all([
          window.usa || window.usaExtended ? fetchFmpMovers() : Promise.resolve([] as SeedRow[]),
          fetchCryptoSeeds(),
          fetchRegionalEtfSeeds(),
          fetchIbkrScanner(),
          fetchFallbackUniverse(),
          fetchOpenPositions(),
          fetchSpyMomentum5d().catch(() => 0),
          fetchEarningsToday().catch(() => [] as string[]),
          fetchSectorLeader().catch(() => ({ etf: "XLK", changePct: 0 })),
        ]);

      const sourcesUsed = [
        cryptoRows.length ? "ibkr-crypto" : "",
        fmpMovers.length ? "fmp-movers" : "",
        regionalRows.length ? "fmp-profile-regional" : "",
        ibkrRows.length ? "ibkr-scanner" : "",
        fallbackRows.length ? "fallback-738" : "",
        portfolioRows.length ? "portfolio" : "",
      ].filter(Boolean);

      const merged = mergeSeeds([cryptoRows, fmpMovers, regionalRows, ibkrRows, fallbackRows, portfolioRows]);
      const forceKeep = new Set([
        ...IBKR_CRYPTO_TICKERS,
        ...portfolioRows.map((r) => r.symbol),
        ...regionalRows.map((r) => r.symbol),
      ]);
      const enriched = await enrichWithQuotes(merged);
      const filtered = enriched.filter((r) => passesFilters(r, forceKeep));
      const ranked = [...filtered].sort((a, b) => seedScore(b) - seedScore(a));
      const candidates = ranked.slice(0, HISTORY_CANDIDATES);

      // Screener-only enrichment — never call historical-price-eod (Starter 402)
      const withMomentum = candidates.map((r) =>
        tickerFromSeed(r, spy5d, r.changePct, 0),
      );

      const excluded = new Set(excludedEarnings);
      // Always keep portfolio names even on earnings day (user already holds them).
      let finalTop = withMomentum
        .filter((t) => forceKeep.has(t.symbol) || !excluded.has(t.symbol))
        .sort((a, b) => b.score - a.score)
        .slice(0, TOP_COUNT);

      const cryptoKept = cryptoRows.map((r) => tickerFromSeed(r, spy5d, r.changePct, 0));
      const missingCrypto = cryptoKept.filter((c) => !finalTop.some((t) => t.symbol === c.symbol));
      if (missingCrypto.length > 0) {
        finalTop = [...missingCrypto, ...finalTop].slice(0, TOP_COUNT);
      }

      // Force BTC/ETH (+ full PAXOS set) always present in analysis universe
      const ensured = ensureCryptoInTickerList(finalTop.map((t) => t.symbol));
      const bySym = new Map(finalTop.map((t) => [t.symbol, t]));
      for (const sym of ensured) {
        if (!bySym.has(sym)) {
          const seed = cryptoRows.find((r) => r.symbol === sym);
          bySym.set(
            sym,
            tickerFromSeed(
              seed ?? {
                symbol: sym,
                price: 0,
                changePct: 0,
                volume: 0,
                avgVolume: 0,
                yearHigh: 0,
                sources: ["ibkr-crypto-paxos"],
              },
              spy5d,
              seed?.changePct ?? 0,
              0,
            ),
          );
        }
      }
      finalTop = ensured.map((s) => bySym.get(s)!).filter(Boolean).slice(0, Math.max(TOP_COUNT, IBKR_CRYPTO_TICKERS.length));

      void verifyCryptoTradingStatus(finalTop.map((t) => t.symbol));

      if (finalTop.length === 0 && ranked.length > 0) {
        finalTop = ranked.slice(0, TOP_COUNT).map((r) => tickerFromSeed(r, spy5d, r.changePct, 0));
      }

      const primarySource: DailyUniverseCache["source"] =
        fmpMovers.length || ibkrRows.length
          ? "multi-source"
          : fallbackRows.length
            ? "fallback-738"
            : "multi-source";

      const payload: DailyUniverseCache = {
        generatedAt: new Date().toISOString(),
        nextRefreshAt: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
        source: primarySource,
        screenerCount: merged.length,
        sourcesUsed,
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
        console.log(
          `[Universe] TOP ${finalTop.length} cargados: ${preview}${finalTop.length > 12 ? "..." : ""} (sources=${sourcesUsed.join("+")})`,
        );
      } else {
        console.error("[Universe] TOP 100 vacío — reusando caché previa si existe");
        if (cached && cached.tickers.length > 0) return cached;
      }

      const now = madridNowParts();
      const dateKey = `${now.y}-${now.m}-${now.d}`;
      // Morning brief: log only — no Telegram (política silencio)
      if (finalTop.length > 0 && now.hh === 9 && now.mm >= 5 && lastMorningBriefDate !== dateKey) {
        lastMorningBriefDate = dateKey;
        const top5 = finalTop.slice(0, 5).map((t) => `${t.symbol} (${t.score.toFixed(2)})`).join(", ");
        console.log(
          `[Universe] MERCADO HOY top5=${top5} sources=${sourcesUsed.join(",") || "n/a"} ` +
            `sector=${payload.sectorLeader.etf} (${payload.sectorLeader.changePct.toFixed(2)}%)`,
        );
      }

      if (finalTop.length > 0 && Date.now() - lastSpecialAlertAt > 5 * 60 * 1000) {
        lastSpecialAlertAt = Date.now();
        const unusualVol = finalTop.find((t) => t.avgVolume > 0 && t.volume / t.avgVolume >= 5);
        if (unusualVol) {
          console.log(
            `[Universe] volumen inusual (sin Telegram): ${unusualVol.symbol} x${(unusualVol.volume / unusualVol.avgVolume).toFixed(1)}`,
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

export function getDailyUniverse(): DailyUniverseCache | null {
  return getDailyMarketUniverse();
}

export async function ensureDailyUniverse(): Promise<DailyUniverseCache> {
  const cached = readCache();
  if (!cached || cached.tickers.length === 0) {
    return refreshDailyMarketUniverse(true);
  }
  return refreshDailyMarketUniverse(false);
}
