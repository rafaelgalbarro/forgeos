import "server-only";

import { cacheKey, getCached, setCached } from "@/lib/market-data/cache";
import {
  getBatchPrices,
  getDailyBars,
  type YahooQuote,
} from "@/lib/market-data/yahoo-finance";
import type { AnalysisMacroContext } from "@/src/core/trading/ai/trading-agent";

const CACHE_TTL_MS = 12 * 60 * 1000; // ~10–15 min

/**
 * Dollar proxy symbols tried in order.
 * Verified: Yahoo chart API serves ICE US Dollar Index as `DX-Y.NYB` (preferred).
 * If DX-Y.NYB is missing from the batch/chart response, fall back to `UUP`
 * (Invesco DB US Dollar Index Bullish Fund) as a liquid dollar proxy.
 * Note: Yahoo v7 `/finance/quote` may 401 in some environments; chart fallback covers that.
 */
export const DXY_YAHOO_CANDIDATES = ["DX-Y.NYB", "UUP"] as const;

const SECTOR_ETFS = [
  { etf: "XLK", name: "Technology" },
  { etf: "XLF", name: "Financials" },
  { etf: "XLE", name: "Energy" },
  { etf: "XLV", name: "Healthcare" },
  { etf: "XLI", name: "Industrials" },
  { etf: "XLY", name: "Consumer Discretionary" },
  { etf: "XLP", name: "Consumer Staples" },
  { etf: "XLU", name: "Utilities" },
  { etf: "XLB", name: "Materials" },
  { etf: "XLRE", name: "Real Estate" },
] as const;

const MACRO_TICKERS = [
  "TLT",
  "GLD",
  "USO",
  "^VIX",
  ...DXY_YAHOO_CANDIDATES,
  ...SECTOR_ETFS.map((s) => s.etf),
] as const;

export type MacroQuoteSnapshot = {
  readonly symbol: string;
  readonly price: number | null;
  readonly changePct: number | null;
};

export type MacroSectorMove = {
  readonly etf: string;
  readonly name: string;
  readonly changePct: number;
};

export type MacroContext = {
  readonly tlt: MacroQuoteSnapshot;
  readonly dollar: MacroQuoteSnapshot & {
    /** Which Yahoo symbol resolved: DX-Y.NYB | UUP | null */
    readonly resolvedSymbol: string | null;
  };
  readonly gld: MacroQuoteSnapshot;
  readonly uso: MacroQuoteSnapshot;
  readonly vix: MacroQuoteSnapshot;
  readonly yieldSpread2s10s: number | null;
  readonly yieldSource: "fred_csv" | "fred_api" | "NO_DATA";
  readonly riskBias: "risk_on" | "risk_off" | "neutral" | "NO_DATA";
  readonly riskOff: boolean;
  readonly strongestSector: MacroSectorMove | null;
  readonly weakestSector: MacroSectorMove | null;
  readonly sourcesUsed: readonly string[];
  readonly errors: readonly string[];
  readonly computedAt: string;
};

function envEnabled(name: string, defaultValue = true): boolean {
  const v = process.env[name]?.trim().toLowerCase();
  if (!v) return defaultValue;
  return v === "true" || v === "1" || v === "yes";
}

export function isMacroContextEnabled(): boolean {
  return envEnabled("MACRO_CONTEXT_ENABLED", true);
}

function quoteSnap(quotes: Map<string, YahooQuote>, symbol: string): MacroQuoteSnapshot {
  const q = quotes.get(symbol.toUpperCase()) ?? quotes.get(symbol);
  if (!q) return { symbol, price: null, changePct: null };
  return { symbol: q.symbol, price: q.price, changePct: q.changePct };
}

/** Chart API fallback when v7 batch quote is empty/401 — derives change from last two closes. */
async function fillMissingFromCharts(
  quotes: Map<string, YahooQuote>,
  symbols: readonly string[],
): Promise<void> {
  const missing = symbols.filter((s) => !quotes.has(s.toUpperCase()) && !quotes.has(s));
  if (missing.length === 0) return;

  await Promise.all(
    missing.map(async (symbol) => {
      try {
        const bars = await getDailyBars(symbol, "5d");
        if (bars.length < 2) return;
        const last = bars[bars.length - 1]!;
        const prev = bars[bars.length - 2]!;
        if (!(last.close > 0) || !(prev.close > 0)) return;
        const changePct = ((last.close - prev.close) / prev.close) * 100;
        const key = symbol.toUpperCase();
        quotes.set(key, {
          symbol: key,
          price: last.close,
          changePct,
          volume: last.volume,
          avgVolume: last.volume,
          high52w: last.close,
          low52w: last.close,
          bid: last.close,
          ask: last.close,
        });
      } catch {
        /* per-symbol isolate */
      }
    }),
  );
}

function fmtPct(v: number | null): string {
  if (v == null || !Number.isFinite(v)) return "NO_DATA";
  return `${v > 0 ? "+" : ""}${v.toFixed(2)}%`;
}

function riskBiasFromTlt(changePct: number | null): MacroContext["riskBias"] {
  if (changePct == null || !Number.isFinite(changePct)) return "NO_DATA";
  if (changePct < -0.15) return "risk_off";
  if (changePct > 0.15) return "risk_on";
  return "neutral";
}

function dollarImpact(changePct: number | null): string {
  if (changePct == null || !Number.isFinite(changePct)) return "NO_DATA";
  if (changePct > 0.2) return "presión sobre emergentes / commodities";
  if (changePct < -0.2) return "alivio para emergentes / commodities";
  return "impacto neutro en emergentes";
}

function vixFearLevel(vix: number | null): string {
  if (vix == null || !Number.isFinite(vix)) return "NO_DATA";
  if (vix >= 30) return "miedo extremo";
  if (vix >= 25) return "miedo elevado";
  if (vix >= 20) return "cautela";
  if (vix >= 15) return "normal";
  return "complacencia";
}

function goldSignal(changePct: number | null): string {
  if (changePct == null || !Number.isFinite(changePct)) return "NO_DATA";
  if (changePct > 0.3) return "señal de miedo/inflación";
  if (changePct < -0.3) return "menor demanda de refugio";
  return "neutro";
}

function recessionFromSpread(spread: number | null): "sí" | "no" | "NO_DATA" {
  if (spread == null || !Number.isFinite(spread)) return "NO_DATA";
  return spread < 0 ? "sí" : "no";
}

function riskLabel(bias: MacroContext["riskBias"]): string {
  if (bias === "risk_off") return "risk off";
  if (bias === "risk_on") return "risk on";
  if (bias === "neutral") return "neutro";
  return "NO_DATA";
}

/** Resolve DXY: try DX-Y.NYB first, then UUP dollar proxy. */
function resolveDollar(quotes: Map<string, YahooQuote>): MacroContext["dollar"] {
  for (const sym of DXY_YAHOO_CANDIDATES) {
    const snap = quoteSnap(quotes, sym);
    if (snap.price != null && snap.changePct != null) {
      return { ...snap, resolvedSymbol: snap.symbol };
    }
  }
  return {
    symbol: DXY_YAHOO_CANDIDATES[0],
    price: null,
    changePct: null,
    resolvedSymbol: null,
  };
}

async function fetchYieldSpreadT10Y2Y(errors: string[]): Promise<{
  spread: number | null;
  source: MacroContext["yieldSource"];
}> {
  const apiKey = process.env.FRED_API_KEY?.trim();
  if (apiKey) {
    try {
      const url =
        `https://api.stlouisfed.org/fred/series/observations` +
        `?series_id=T10Y2Y&api_key=${encodeURIComponent(apiKey)}` +
        `&file_type=json&sort_order=desc&limit=1`;
      const res = await fetch(url, {
        headers: { Accept: "application/json", "User-Agent": "ForgeOS MacroContext/1.0" },
        cache: "no-store",
        signal: AbortSignal.timeout(15_000),
      });
      if (res.ok) {
        const body = (await res.json()) as {
          observations?: Array<{ value?: string }>;
        };
        const raw = body.observations?.[0]?.value;
        const value = raw != null ? Number(raw) : NaN;
        if (Number.isFinite(value)) return { spread: value, source: "fred_api" };
      }
      errors.push("FRED API T10Y2Y: sin dato válido");
    } catch (err) {
      errors.push(
        `FRED API T10Y2Y: ${err instanceof Error ? err.message : "fetch failed"}`,
      );
    }
  }

  try {
    const url = "https://fred.stlouisfed.org/graph/fredgraph.csv?id=T10Y2Y";
    const res = await fetch(url, {
      headers: { Accept: "text/csv", "User-Agent": "ForgeOS MacroContext/1.0" },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      errors.push(`FRED CSV T10Y2Y: HTTP ${res.status}`);
      return { spread: null, source: "NO_DATA" };
    }
    const text = await res.text();
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    // Skip header; walk from end for latest non-missing observation
    for (let i = lines.length - 1; i >= 1; i -= 1) {
      const parts = lines[i].split(",");
      const raw = parts[1]?.trim();
      if (!raw || raw === "." || raw.toUpperCase() === "ND") continue;
      const value = Number(raw);
      if (Number.isFinite(value)) return { spread: value, source: "fred_csv" };
    }
    errors.push("FRED CSV T10Y2Y: sin observación numérica");
  } catch (err) {
    errors.push(
      `FRED CSV T10Y2Y: ${err instanceof Error ? err.message : "fetch failed"}`,
    );
  }

  return { spread: null, source: "NO_DATA" };
}

function pickSectorExtremes(quotes: Map<string, YahooQuote>): {
  strongest: MacroSectorMove | null;
  weakest: MacroSectorMove | null;
} {
  const moves: MacroSectorMove[] = [];
  for (const s of SECTOR_ETFS) {
    const q = quotes.get(s.etf);
    if (!q || !Number.isFinite(q.changePct)) continue;
    moves.push({ etf: s.etf, name: s.name, changePct: q.changePct });
  }
  if (moves.length === 0) return { strongest: null, weakest: null };
  let strongest = moves[0];
  let weakest = moves[0];
  for (const m of moves) {
    if (m.changePct > strongest.changePct) strongest = m;
    if (m.changePct < weakest.changePct) weakest = m;
  }
  return { strongest, weakest };
}

function emptyMacro(errors: string[]): MacroContext {
  const noData: MacroQuoteSnapshot = { symbol: "NO_DATA", price: null, changePct: null };
  return {
    tlt: { ...noData, symbol: "TLT" },
    dollar: { ...noData, symbol: "DX-Y.NYB", resolvedSymbol: null },
    gld: { ...noData, symbol: "GLD" },
    uso: { ...noData, symbol: "USO" },
    vix: { ...noData, symbol: "^VIX" },
    yieldSpread2s10s: null,
    yieldSource: "NO_DATA",
    riskBias: "NO_DATA",
    riskOff: false,
    strongestSector: null,
    weakestSector: null,
    sourcesUsed: [],
    errors,
    computedAt: new Date().toISOString(),
  };
}

/**
 * Inter-market / macro snapshot for TradingAgent (Yahoo batch + optional FRED).
 * Cached ~12 minutes. Never invents values — missing fields stay null / NO_DATA.
 */
export async function getMacroContext(): Promise<MacroContext> {
  if (!isMacroContextEnabled()) {
    return emptyMacro(["Macro context deshabilitado (MACRO_CONTEXT_ENABLED=false)"]);
  }

  const cacheId = cacheKey("macro", "intermarket-context");
  const cached = getCached<MacroContext>(cacheId);
  if (cached) return cached;

  const errors: string[] = [];
  const sourcesUsed: string[] = [];

  const [quotes, yieldData] = await Promise.all([
    getBatchPrices([...MACRO_TICKERS]).catch((err) => {
      errors.push(`Yahoo batch: ${err instanceof Error ? err.message : "failed"}`);
      return new Map<string, YahooQuote>();
    }),
    fetchYieldSpreadT10Y2Y(errors),
  ]);

  // If v7 quote batch is empty/partial (e.g. HTTP 401), fill via chart API — still real data.
  await fillMissingFromCharts(quotes, [...MACRO_TICKERS]);

  const tlt = quoteSnap(quotes, "TLT");
  const gld = quoteSnap(quotes, "GLD");
  const uso = quoteSnap(quotes, "USO");
  const vix = quoteSnap(quotes, "^VIX");
  const dollar = resolveDollar(quotes);
  const { strongest, weakest } = pickSectorExtremes(quotes);
  const riskBias = riskBiasFromTlt(tlt.changePct);

  if (tlt.changePct != null) sourcesUsed.push("TLT");
  else errors.push("TLT: NO_DATA");
  if (dollar.resolvedSymbol) sourcesUsed.push(`DXY:${dollar.resolvedSymbol}`);
  else errors.push("DXY/UUP: NO_DATA");
  if (gld.changePct != null) sourcesUsed.push("GLD");
  else errors.push("GLD: NO_DATA");
  if (uso.changePct != null) sourcesUsed.push("USO");
  else errors.push("USO: NO_DATA");
  if (vix.price != null) sourcesUsed.push("VIX");
  else errors.push("VIX: NO_DATA");
  if (yieldData.spread != null) sourcesUsed.push(`T10Y2Y:${yieldData.source}`);
  if (strongest) sourcesUsed.push("sector-ETFs");

  const result: MacroContext = {
    tlt,
    dollar,
    gld,
    uso,
    vix,
    yieldSpread2s10s: yieldData.spread,
    yieldSource: yieldData.source,
    riskBias,
    riskOff: riskBias === "risk_off",
    strongestSector: strongest,
    weakestSector: weakest,
    sourcesUsed,
    errors,
    computedAt: new Date().toISOString(),
  };

  setCached(cacheId, result, CACHE_TTL_MS);
  console.log(
    `[MacroContext] risk=${riskBias} dxy=${dollar.resolvedSymbol ?? "NO_DATA"} ` +
      `vix=${vix.price?.toFixed(1) ?? "NO_DATA"} yield=${yieldData.spread ?? "NO_DATA"} ` +
      `sectors=${strongest?.etf ?? "NO_DATA"}/${weakest?.etf ?? "NO_DATA"}`,
  );
  return result;
}

/** Spanish block injected into TradingAgent prompts. */
export function formatMacroContextForAgent(ctx: MacroContext): string {
  const vixVal =
    ctx.vix.price != null && Number.isFinite(ctx.vix.price)
      ? ctx.vix.price.toFixed(1)
      : "NO_DATA";
  const yieldVal =
    ctx.yieldSpread2s10s != null && Number.isFinite(ctx.yieldSpread2s10s)
      ? `${ctx.yieldSpread2s10s.toFixed(2)}%`
      : "NO_DATA";
  const strong =
    ctx.strongestSector != null
      ? `${ctx.strongestSector.name} (${ctx.strongestSector.etf} ${fmtPct(ctx.strongestSector.changePct)})`
      : "NO_DATA";
  const weak =
    ctx.weakestSector != null
      ? `${ctx.weakestSector.name} (${ctx.weakestSector.etf} ${fmtPct(ctx.weakestSector.changePct)})`
      : "NO_DATA";

  return `CONTEXTO MACRO ACTUAL:
- Bonos (TLT): ${fmtPct(ctx.tlt.changePct)} → ${riskLabel(ctx.riskBias)}
- Dólar (${ctx.dollar.resolvedSymbol ?? "DXY"}): ${fmtPct(ctx.dollar.changePct)} → ${dollarImpact(ctx.dollar.changePct)}
- VIX: ${vixVal} → ${vixFearLevel(ctx.vix.price)}
- Yield curve: ${yieldVal} → señal de recesión: ${recessionFromSpread(ctx.yieldSpread2s10s)}
- Sector más fuerte hoy: ${strong}
- Sector más débil hoy: ${weak}
- Oro (GLD): ${fmtPct(ctx.gld.changePct)} → ${goldSignal(ctx.gld.changePct)}
- Petróleo (USO): ${fmtPct(ctx.uso.changePct)} → correlación energía`;
}

/** Maps macro snapshot to TradingAgent MarketContext.macro shape. */
export function macroToAgentContext(ctx: MacroContext): AnalysisMacroContext {
  return {
    tltChangePct: ctx.tlt.changePct,
    riskBias: ctx.riskBias,
    riskOff: ctx.riskOff,
    dollarSymbol: ctx.dollar.resolvedSymbol,
    dollarChangePct: ctx.dollar.changePct,
    gldChangePct: ctx.gld.changePct,
    usoChangePct: ctx.uso.changePct,
    vix: ctx.vix.price,
    vixChangePct: ctx.vix.changePct,
    yieldSpread2s10s: ctx.yieldSpread2s10s,
    recessionSignal: recessionFromSpread(ctx.yieldSpread2s10s),
    strongestSector: ctx.strongestSector
      ? {
          etf: ctx.strongestSector.etf,
          name: ctx.strongestSector.name,
          changePct: ctx.strongestSector.changePct,
        }
      : null,
    weakestSector: ctx.weakestSector
      ? {
          etf: ctx.weakestSector.etf,
          name: ctx.weakestSector.name,
          changePct: ctx.weakestSector.changePct,
        }
      : null,
    formattedBlock: formatMacroContextForAgent(ctx),
    computedAt: ctx.computedAt,
  };
}

/** Soft score dampener for BUY bias under risk-off (keep light). */
export function macroBuyScoreAdjustment(ctx: MacroContext | null | undefined): number {
  if (!ctx?.riskOff) return 0;
  return -6;
}
