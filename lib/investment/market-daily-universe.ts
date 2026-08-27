import "server-only";

import fs from "node:fs";
import path from "node:path";
import {
  getFmpMovers,
  getEuropeanAdrsFromFmp,
  warmQuoteCache,
} from "@/lib/market-data/fmp";
import { getTickerUniverse } from "@/lib/market-data/ticker-universe";
import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import {
  ASIA_DIRECT_TICKERS,
  ASIA_ETF_TICKERS,
  EUROPE_DIRECT_TICKERS,
  EUROPE_ETF_TICKERS,
  getActiveTradingPhase,
  getGlobalMarketWindow,
} from "@/src/core/trading/market-session";
import { IBKR_CRYPTO_TICKERS, ensureCryptoInTickerList, verifyCryptoTradingStatus } from "@/src/core/trading/crypto-ibkr";

const CACHE_DIR = path.resolve(process.cwd(), ".forgeos", "cache");
const CACHE_FILE = path.join(CACHE_DIR, "market-daily-universe.json");
/** Max universe from FMP movers + session seeds. */
const TOP_COUNT_MAX = 400;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour — align with FMP movers cache
const HISTORY_CANDIDATES_MAX = 400;

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

function asSymbol(raw: unknown): string {
  const s = String(raw ?? "").trim().toUpperCase();
  return /^[A-Z][A-Z0-9.-]{0,9}$/.test(s) ? s : "";
}

/** Crypto spot IBKR (PAXOS) — siempre en el universo, mercado 24h. Precios vía IBKR en ciclo. */
async function fetchCryptoSeeds(): Promise<SeedRow[]> {
  const unique = [...IBKR_CRYPTO_TICKERS];
  console.log(`[Universe] Crypto 24h IBKR (${unique.join(", ")}) — sin FMP quote`);
  return unique.map((symbol) => ({
    symbol,
    price: 0,
    changePct: 0,
    volume: 0,
    avgVolume: 0,
    yearHigh: 0,
    sources: ["ibkr-crypto-paxos"],
  }));
}

async function fetchRegionalEtfSeeds(): Promise<SeedRow[]> {
  const w = getGlobalMarketWindow();
  const phase = getActiveTradingPhase();
  const symbols: string[] = [];
  // Session seeds without country filter on the base movers — add regional ETFs/ADRs for focus
  if (w.asia || phase === "ASIA") symbols.push(...ASIA_ETF_TICKERS, ...ASIA_DIRECT_TICKERS);
  if (w.europe || phase === "EUROPE" || phase === "EUROPE_OPEN") {
    symbols.push(...EUROPE_ETF_TICKERS, ...EUROPE_DIRECT_TICKERS);
  }
  // USA / extended: keep both regional sets available for ADRs that trade in US hours
  if (w.usa || w.usaExtended || phase.startsWith("USA")) {
    symbols.push(...ASIA_ETF_TICKERS, ...ASIA_DIRECT_TICKERS, ...EUROPE_ETF_TICKERS, ...EUROPE_DIRECT_TICKERS);
  }
  if (symbols.length === 0) {
    // Standby / crypto: still seed liquid regional ETFs lightly
    symbols.push(...ASIA_ETF_TICKERS.slice(0, 3), ...EUROPE_ETF_TICKERS.slice(0, 3));
  }
  const unique = [...new Set(symbols.map((s) => s.toUpperCase()))];
  console.log(`[Universe] Regional ETFs/ADRs seed (${unique.length})`);
  return unique.map((symbol) => ({
    symbol,
    price: 0,
    changePct: 0,
    volume: 0,
    avgVolume: 0,
    yearHigh: 0,
    sources: ["regional-seed"],
  }));
}

/** European ADRs from FMP company-screener (24h) — optional supplement; movers are primary. */
async function fetchEuropeanAdrSeeds(): Promise<SeedRow[]> {
  const phase = getActiveTradingPhase();
  const w = getGlobalMarketWindow();
  if (!w.europe && phase !== "EUROPE" && phase !== "EUROPE_OPEN" && !w.usa) return [];
  console.log("[Universe] Cargando ADRs europeos FMP (company-screener, caché 24h)…");
  const adrs = await getEuropeanAdrsFromFmp().catch(() => []);
  const rows: SeedRow[] = adrs.map((g) => ({
    symbol: g.symbol,
    price: g.price,
    changePct: g.changePercentage,
    volume: g.volume,
    avgVolume: g.avgVolume ?? g.volume,
    yearHigh: g.yearHigh ?? g.price,
    sources: ["fmp-eu-adr"],
  }));
  console.log(`[Universe] ADRs europeos: ${rows.length} filas`);
  return rows;
}

/** FUENTE 1 — FMP MAX movers (gainers/losers/actives/most-active), up to ~400 unique. */
async function fetchFmpMovers(): Promise<SeedRow[]> {
  console.log("[Universe] Cargando FMP movers MAX (gainers/losers/actives/most-active, caché 1h)...");
  const movers = await getFmpMovers();
  const rows = movers.all.map((g) => ({
    symbol: g.symbol,
    price: g.price,
    changePct: g.changePercentage,
    volume: g.volume,
    avgVolume: g.avgVolume ?? g.volume,
    yearHigh: g.yearHigh ?? g.price,
    sources: [g.source],
  }));
  console.log(`[Universe] FMP movers unique: ${rows.length} filas`);
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
  // Prefer mover-seeded prices; optional batch warm happens after finalTop.
  return seeds;
}

function passesFilters(r: SeedRow, forceKeep: Set<string>): boolean {
  if (forceKeep.has(r.symbol)) return true;
  // Max-universe mode: keep all FMP movers / regional seeds regardless of price band
  if (r.sources.some((s) => s.startsWith("fmp-") || s.startsWith("ibkr-") || s === "regional-seed")) {
    return true;
  }
  if (r.price <= 0) return false;
  if (!(r.price >= 0.1 && r.price <= 500)) return false;
  if (r.volume > 0 && r.volume < 50_000 && r.avgVolume < 50_000) return false;
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
  // No FMP profile calls for SPY — Starter reserved for gainers + EOD history only.
  return 0;
}

async function fetchEarningsToday(): Promise<string[]> {
  // Skip FMP earnings calendar to protect Starter quota.
  return [];
}

async function fetchSectorLeader(): Promise<{ etf: string; changePct: number }> {
  // No FMP batch quotes — default until IBKR sector scan exists.
  return { etf: "XLK", changePct: 0 };
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
      console.log("[Universe] Screener MAX (FMP movers + regional + IBKR + crypto + portfolio)...");
      const phase = getActiveTradingPhase();
      void getGlobalMarketWindow();
      const topCount = TOP_COUNT_MAX;
      const historyCandidates = HISTORY_CANDIDATES_MAX;

      const [fmpMovers, cryptoRows, regionalRows, euAdrRows, ibkrRows, fallbackRows, portfolioRows, spy5d, excludedEarnings, sectorLeader] =
        await Promise.all([
          // Always load max movers — no country filter
          fetchFmpMovers(),
          fetchCryptoSeeds(),
          fetchRegionalEtfSeeds(),
          fetchEuropeanAdrSeeds(),
          fetchIbkrScanner(),
          // Fallback only if movers empty
          Promise.resolve([] as SeedRow[]),
          fetchOpenPositions(),
          fetchSpyMomentum5d().catch(() => 0),
          fetchEarningsToday().catch(() => [] as string[]),
          fetchSectorLeader().catch(() => ({ etf: "XLK", changePct: 0 })),
        ]);

      // Use fallback universe only when movers failed
      const fallback =
        fmpMovers.length === 0 ? await fetchFallbackUniverse() : fallbackRows;

      const sourcesUsed = [
        cryptoRows.length ? "ibkr-crypto" : "",
        fmpMovers.length ? "fmp-movers-max" : "",
        regionalRows.length ? "regional-etf-adr" : "",
        euAdrRows.length ? "fmp-eu-adr" : "",
        ibkrRows.length ? "ibkr-scanner" : "",
        fallback.length ? "fallback-738" : "",
        portfolioRows.length ? "portfolio" : "",
      ].filter(Boolean);

      const merged = mergeSeeds([
        cryptoRows,
        fmpMovers,
        regionalRows,
        euAdrRows,
        ibkrRows,
        fallback,
        portfolioRows,
      ]);
      const forceKeep = new Set([
        ...IBKR_CRYPTO_TICKERS,
        ...portfolioRows.map((r) => r.symbol),
        ...regionalRows.map((r) => r.symbol),
        ...ASIA_DIRECT_TICKERS,
        ...EUROPE_ETF_TICKERS,
        ...EUROPE_DIRECT_TICKERS,
      ]);
      const enriched = await enrichWithQuotes(merged);
      const filtered = enriched.filter((r) => passesFilters(r, forceKeep));
      const ranked = [...filtered].sort((a, b) => seedScore(b) - seedScore(a));
      // Prefer ALL FMP movers first (no country cut), then regional, then rest — cap 400
      const moverSyms = new Set(fmpMovers.map((r) => r.symbol));
      const priority = ranked.filter((r) => moverSyms.has(r.symbol) || forceKeep.has(r.symbol));
      const rest = ranked.filter((r) => !moverSyms.has(r.symbol) && !forceKeep.has(r.symbol));
      const candidates = [...priority, ...rest].slice(0, Math.max(historyCandidates, topCount));

      const withMomentum = candidates.map((r) =>
        tickerFromSeed(r, spy5d, r.changePct, 0),
      );

      const excluded = new Set(excludedEarnings);
      let finalTop = withMomentum
        .filter((t) => forceKeep.has(t.symbol) || !excluded.has(t.symbol))
        .sort((a, b) => {
          const aM = a.sources.some((s) => s === "fmp-gainers") ? 2 : a.sources.some((s) => s.includes("active")) ? 1 : 0;
          const bM = b.sources.some((s) => s === "fmp-gainers") ? 2 : b.sources.some((s) => s.includes("active")) ? 1 : 0;
          return bM - aM || b.score - a.score;
        })
        .slice(0, topCount);

      const cryptoKept = cryptoRows.map((r) => tickerFromSeed(r, spy5d, r.changePct, 0));
      const missingCrypto = cryptoKept.filter((c) => !finalTop.some((t) => t.symbol === c.symbol));
      if (missingCrypto.length > 0) {
        finalTop = [...missingCrypto, ...finalTop].slice(0, topCount);
      }

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
      finalTop = ensured.map((s) => bySym.get(s)!).filter(Boolean).slice(0, Math.max(topCount, IBKR_CRYPTO_TICKERS.length));

      void verifyCryptoTradingStatus(finalTop.map((t) => t.symbol));

      if (finalTop.length === 0 && ranked.length > 0) {
        finalTop = ranked.slice(0, topCount).map((r) => tickerFromSeed(r, spy5d, r.changePct, 0));
      }

      // Prewarm FMP quote cache (batches of 50) so cycles avoid per-ticker FMP HTTP
      if (finalTop.length > 0) {
        await warmQuoteCache(finalTop.map((t) => t.symbol)).catch((err) => {
          console.warn(
            "[Universe] warmQuoteCache failed:",
            err instanceof Error ? err.message : err,
          );
        });
      }

      const primarySource: DailyUniverseCache["source"] =
        fmpMovers.length || ibkrRows.length
          ? "multi-source"
          : fallback.length
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
          `[Universe] MAX ${finalTop.length} tickers: ${preview}${finalTop.length > 12 ? "..." : ""} (sources=${sourcesUsed.join("+")}) phase=${phase}`,
        );
      } else {
        console.error("[Universe] universo vacío — reusando caché previa si existe");
        if (cached && cached.tickers.length > 0) return cached;
      }

      const now = madridNowParts();
      const dateKey = `${now.y}-${now.m}-${now.d}`;
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
