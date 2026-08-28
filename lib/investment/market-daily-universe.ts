import "server-only";

import fs from "node:fs";
import path from "node:path";
import { getTickerUniverse } from "@/lib/market-data/ticker-universe";
import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import {
  ASIA_DIRECT_TICKERS,
  ASIA_ETF_TICKERS,
  EUROPE_DIRECT_TICKERS,
  EUROPE_ETF_TICKERS,
  getActiveTradingPhase,
  getGlobalMarketWindow,
  isEuropeOpen,
  isUSAExtendedOpen,
  isUSAOpen,
} from "@/src/core/trading/market-session";
import { IBKR_CRYPTO_TICKERS, ensureCryptoInTickerList, verifyCryptoTradingStatus } from "@/src/core/trading/crypto-ibkr";

const CACHE_DIR = path.resolve(process.cwd(), ".forgeos", "cache");
const CACHE_FILE = path.join(CACHE_DIR, "market-daily-universe.json");
/** 4 IBKR scanners × 50 ≈ 200 unique + session seeds. */
const TOP_COUNT_MAX = 220;
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes
const HISTORY_CANDIDATES_MAX = 220;

const IBKR_SCAN_CODES = [
  "TOP_PERC_GAIN",
  "TOP_PERC_LOSE",
  "MOST_ACTIVE",
  "HIGH_VS_52_WK_HL",
  "HOT_BY_VOLUME",
] as const;

/** ETFs europeos + ADRs + mega-caps USA con liquidez en horario EU (09:00–17:30 Madrid). */
const EUROPE_UNIVERSE = [
  "EZU",
  "VGK",
  "EWG",
  "EWU",
  "EWQ",
  "EWI",
  "EWP",
  "FEZ",
  "IEV",
  "LVMUY",
  "LRLCY",
  "BMWYY",
  "RHHBY",
  "AIQUY",
  "EADSY",
  "BAESY",
  "HEINY",
  "SBGSY",
  "AXAHY",
  "DNNGY",
  "CSGPY",
  "AKZOY",
  "AAPL",
  "MSFT",
  "GOOGL",
  "AMZN",
  "NVDA",
  "META",
  "TSLA",
  "JPM",
  "BAC",
  "GS",
  "MS",
  "WMT",
  "JNJ",
  "PFE",
  "XOM",
] as const;

/** Europa abierta sin sesión USA — el scanner IBKR devuelve tickers USA cerrados. */
function isEuropeanUniverseSession(): boolean {
  return isEuropeOpen() && !isUSAOpen() && !isUSAExtendedOpen();
}

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
  source: "multi-source" | "fmp-movers" | "ibkr-scanner" | "europe-universe" | "fallback-738";
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

/** Crypto spot IBKR (PAXOS) — siempre en el universo, mercado 24h. */
async function fetchCryptoSeeds(): Promise<SeedRow[]> {
  const unique = [...IBKR_CRYPTO_TICKERS];
  console.log(`[Universe] Crypto 24h IBKR (${unique.join(", ")})`);
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
  if (w.asia || phase === "ASIA") symbols.push(...ASIA_ETF_TICKERS, ...ASIA_DIRECT_TICKERS);
  if (w.europe || phase === "EUROPE" || phase === "EUROPE_OPEN") {
    symbols.push(...EUROPE_ETF_TICKERS, ...EUROPE_DIRECT_TICKERS);
  }
  if (w.usa || w.usaExtended || phase.startsWith("USA")) {
    symbols.push(...ASIA_ETF_TICKERS, ...ASIA_DIRECT_TICKERS, ...EUROPE_ETF_TICKERS, ...EUROPE_DIRECT_TICKERS);
  }
  if (symbols.length === 0) {
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

async function fetchEuropeUniverseSeeds(): Promise<SeedRow[]> {
  console.log(
    `[Universe] Sesión Europa (sin USA) → lista fija ${EUROPE_UNIVERSE.length} tickers (sin IBKR scanner USA)`,
  );
  return EUROPE_UNIVERSE.map((symbol) => ({
    symbol,
    price: 0,
    changePct: 0,
    volume: 0,
    avgVolume: 0,
    yearHigh: 0,
    sources: ["europe-universe"],
  }));
}

/** IBKR scanners exclusively — no FMP movers. */
async function fetchIbkrScanner(): Promise<SeedRow[]> {
  console.log(`[Universe] Cargando IBKR scanner (${IBKR_SCAN_CODES.join(", ")})…`);
  const batches = await Promise.all(
    IBKR_SCAN_CODES.map(async (type) => {
      try {
        const res = await ibkrServiceFetch<{
          ok?: boolean;
          rows?: Array<{ symbol?: string; changePct?: number | null; volume?: number | null }>;
          symbols?: string[];
        }>(`/api/ibkr/scanner?type=${type}&limit=50`, { signal: AbortSignal.timeout(25_000) });
        const rows = res.rows ?? [];
        if (rows.length > 0) {
          return rows
            .map((r) => ({
              symbol: asSymbol(r.symbol),
              price: 0,
              changePct: Number(r.changePct ?? 0) || 0,
              volume: Number(r.volume ?? 0) || 0,
              avgVolume: Number(r.volume ?? 0) || 0,
              yearHigh: 0,
              sources: [`ibkr-${type.toLowerCase()}`],
            }))
            .filter((r) => r.symbol);
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
  const unique = new Set(flat.map((r) => r.symbol));
  console.log(`[Universe] IBKR scanner: ${flat.length} filas → ${unique.size} únicos`);
  return flat;
}

/** Fallback universo ~738 — only if IBKR scanners empty. */
async function fetchFallbackUniverse(): Promise<SeedRow[]> {
  console.log("[Universe] Cargando fallback 738 (IBKR scanner vacío)…");
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

async function fetchOpenPositions(): Promise<SeedRow[]> {
  try {
    const positions = await ibkrServiceFetch<Array<{ symbol?: string; position?: number }>>(
      "/api/ibkr/positions",
    );
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

function passesFilters(r: SeedRow, forceKeep: Set<string>): boolean {
  if (forceKeep.has(r.symbol)) return true;
  if (r.sources.some((s) => s.startsWith("ibkr-") || s === "regional-seed" || s === "europe-universe"))
    return true;
  if (r.price <= 0) return false;
  return true;
}

function seedScore(r: SeedRow): number {
  const volRatio = r.avgVolume > 0 ? r.volume / r.avgVolume : 1;
  const sourceBoost = r.sources.includes("portfolio")
    ? 5
    : r.sources.some((s) => s.startsWith("ibkr-"))
      ? 2
      : 0;
  return Math.abs(r.changePct) * 0.3 + volRatio * 0.2 + sourceBoost;
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

function tickerFromSeed(r: SeedRow, spy5d: number, momentum5d = 0, rsi14 = 0): DailyTicker {
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
      const useEuropeUniverse = isEuropeanUniverseSession();
      console.log(
        useEuropeUniverse
          ? "[Universe] Sesión Europa → universo fijo + crypto + portfolio (sin scanner USA)"
          : "[Universe] Screener IBKR-only (scanner + regional + crypto + portfolio)…",
      );
      const phase = getActiveTradingPhase();
      void getGlobalMarketWindow();
      const topCount = TOP_COUNT_MAX;
      const historyCandidates = HISTORY_CANDIDATES_MAX;

      const [primaryRows, cryptoRows, regionalRows, portfolioRows] = await Promise.all([
        useEuropeUniverse ? fetchEuropeUniverseSeeds() : fetchIbkrScanner(),
        fetchCryptoSeeds(),
        useEuropeUniverse ? Promise.resolve([] as SeedRow[]) : fetchRegionalEtfSeeds(),
        fetchOpenPositions(),
      ]);

      const fallback =
        !useEuropeUniverse && primaryRows.length === 0 ? await fetchFallbackUniverse() : [];

      const sourcesUsed = [
        useEuropeUniverse ? "europe-universe" : primaryRows.length ? "ibkr-scanner" : "",
        cryptoRows.length ? "ibkr-crypto" : "",
        regionalRows.length ? "regional-etf-adr" : "",
        fallback.length ? "fallback-738" : "",
        portfolioRows.length ? "portfolio" : "",
      ].filter(Boolean);

      const merged = mergeSeeds([primaryRows, cryptoRows, regionalRows, fallback, portfolioRows]);
      const forceKeep = new Set([
        ...IBKR_CRYPTO_TICKERS,
        ...portfolioRows.map((r) => r.symbol),
        ...regionalRows.map((r) => r.symbol),
        ...(useEuropeUniverse ? EUROPE_UNIVERSE : []),
        ...ASIA_DIRECT_TICKERS,
        ...EUROPE_ETF_TICKERS,
        ...EUROPE_DIRECT_TICKERS,
      ]);
      const filtered = merged.filter((r) => passesFilters(r, forceKeep));
      const ranked = [...filtered].sort((a, b) => seedScore(b) - seedScore(a));

      const scannerSyms = new Set(primaryRows.map((r) => r.symbol));
      const priority = ranked.filter((r) => scannerSyms.has(r.symbol) || forceKeep.has(r.symbol));
      const rest = ranked.filter((r) => !scannerSyms.has(r.symbol) && !forceKeep.has(r.symbol));
      const candidates = [...priority, ...rest].slice(0, Math.max(historyCandidates, topCount));

      let finalTop = candidates
        .map((r) => tickerFromSeed(r, 0, r.changePct, 0))
        .sort((a, b) => {
          const aM = a.sources.some((s) => s.includes("top_perc_gain") || s.includes("hot_by"))
            ? 2
            : a.sources.some((s) => s.includes("most_active"))
              ? 1
              : 0;
          const bM = b.sources.some((s) => s.includes("top_perc_gain") || s.includes("hot_by"))
            ? 2
            : b.sources.some((s) => s.includes("most_active"))
              ? 1
              : 0;
          return bM - aM || b.score - a.score;
        })
        .slice(0, topCount);

      const cryptoKept = cryptoRows.map((r) => tickerFromSeed(r, 0, r.changePct, 0));
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
              0,
              seed?.changePct ?? 0,
              0,
            ),
          );
        }
      }
      finalTop = ensured
        .map((s) => bySym.get(s)!)
        .filter(Boolean)
        .slice(0, Math.max(topCount, IBKR_CRYPTO_TICKERS.length));

      void verifyCryptoTradingStatus(finalTop.map((t) => t.symbol));

      if (finalTop.length === 0 && ranked.length > 0) {
        finalTop = ranked.slice(0, topCount).map((r) => tickerFromSeed(r, 0, r.changePct, 0));
      }

      const primarySource: DailyUniverseCache["source"] = useEuropeUniverse
        ? "europe-universe"
        : primaryRows.length > 0
          ? "ibkr-scanner"
          : fallback.length
            ? "fallback-738"
            : "ibkr-scanner";

      const payload: DailyUniverseCache = {
        generatedAt: new Date().toISOString(),
        nextRefreshAt: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
        source: primarySource,
        screenerCount: merged.length,
        sourcesUsed,
        tickers: finalTop,
        excludedEarnings: [],
        sectorLeader: { etf: "XLK", changePct: 0 },
      };

      if (finalTop.length > 0) {
        writeCache(payload);
        const preview = finalTop
          .slice(0, 12)
          .map((t) => t.symbol)
          .join(", ");
        console.log(
          `[Universe] IBKR ${finalTop.length} tickers: ${preview}${finalTop.length > 12 ? "..." : ""} (sources=${sourcesUsed.join("+")}) phase=${phase}`,
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
        console.log(`[Universe] MERCADO HOY top5=${top5} sources=${sourcesUsed.join(",") || "n/a"}`);
      }

      if (finalTop.length > 0 && Date.now() - lastSpecialAlertAt > 5 * 60 * 1000) {
        lastSpecialAlertAt = Date.now();
        const unusualVol = finalTop.find((t) => t.avgVolume > 0 && t.volume / t.avgVolume >= 5);
        if (unusualVol) {
          console.log(
            `[Universe] volumen inusual: ${unusualVol.symbol} x${(unusualVol.volume / unusualVol.avgVolume).toFixed(1)}`,
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
