/**
 * FOREX module — pairs, IBKR CASH/IDEALPRO contracts, sessions, risk, pip math.
 * ANALYSIS_ONLY by default; live orders require FOREX_ENABLED + existing live gates.
 */

export type ForexPairId =
  | "EURUSD"
  | "GBPUSD"
  | "USDJPY"
  | "USDCHF"
  | "AUDUSD"
  | "USDCAD"
  | "EURGBP"
  | "EURJPY"
  | "GBPJPY";

export type ForexIbkrContract = {
  readonly pairId: ForexPairId;
  readonly display: string;
  readonly symbol: string;
  readonly currency: string;
  readonly secType: "CASH";
  readonly exchange: "IDEALPRO";
  /** True when quote currency is JPY (pip = 0.01). */
  readonly jpyQuoted: boolean;
};

/**
 * Majors + minors — IBKR IDEALPRO CASH shape:
 * Contract(symbol=BASE, secType=CASH, currency=QUOTE, exchange=IDEALPRO)
 */
export const FOREX_PAIRS: readonly ForexIbkrContract[] = [
  { pairId: "EURUSD", display: "EUR/USD", symbol: "EUR", currency: "USD", secType: "CASH", exchange: "IDEALPRO", jpyQuoted: false },
  { pairId: "GBPUSD", display: "GBP/USD", symbol: "GBP", currency: "USD", secType: "CASH", exchange: "IDEALPRO", jpyQuoted: false },
  { pairId: "USDJPY", display: "USD/JPY", symbol: "USD", currency: "JPY", secType: "CASH", exchange: "IDEALPRO", jpyQuoted: true },
  { pairId: "USDCHF", display: "USD/CHF", symbol: "USD", currency: "CHF", secType: "CASH", exchange: "IDEALPRO", jpyQuoted: false },
  { pairId: "AUDUSD", display: "AUD/USD", symbol: "AUD", currency: "USD", secType: "CASH", exchange: "IDEALPRO", jpyQuoted: false },
  { pairId: "USDCAD", display: "USD/CAD", symbol: "USD", currency: "CAD", secType: "CASH", exchange: "IDEALPRO", jpyQuoted: false },
  { pairId: "EURGBP", display: "EUR/GBP", symbol: "EUR", currency: "GBP", secType: "CASH", exchange: "IDEALPRO", jpyQuoted: false },
  { pairId: "EURJPY", display: "EUR/JPY", symbol: "EUR", currency: "JPY", secType: "CASH", exchange: "IDEALPRO", jpyQuoted: true },
  { pairId: "GBPJPY", display: "GBP/JPY", symbol: "GBP", currency: "JPY", secType: "CASH", exchange: "IDEALPRO", jpyQuoted: true },
] as const;

export const FOREX_PAIR_IDS: readonly ForexPairId[] = FOREX_PAIRS.map((p) => p.pairId);

/** IBKR retail FX often enforces min 25k unit size on IDEALPRO. */
export const FOREX_MIN_UNITS = 25_000;

export type ForexEnvConfig = {
  readonly enabled: boolean;
  readonly maxSpreadPips: number;
  readonly maxPositions: number;
  readonly riskPct: number;
  readonly stopPips: number;
  readonly tpPips: number;
  readonly minConfidence: number;
  readonly minUnits: number;
};

const DEFAULTS: ForexEnvConfig = {
  enabled: false,
  maxSpreadPips: 3,
  maxPositions: 3,
  riskPct: 2,
  stopPips: 20,
  tpPips: 40,
  minConfidence: 0.75,
  minUnits: FOREX_MIN_UNITS,
};

function parseEnvBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw == null || raw.trim() === "") return fallback;
  return ["1", "true", "yes", "on"].includes(raw.trim().toLowerCase());
}

function parseEnvNumber(raw: string | undefined, fallback: number): number {
  if (raw == null || raw.trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/**
 * Load FOREX_* knobs (server / Node only). Defaults keep trading off.
 * Uses static `process.env.FOREX_*` reads so Next.js reliably loads `.env.local`.
 * `ALLOW_FOREX` is accepted as a legacy alias for enablement.
 */
export function loadForexEnvConfig(): ForexEnvConfig {
  const enabled = parseEnvBool(
    process.env.FOREX_ENABLED ?? process.env.ALLOW_FOREX,
    DEFAULTS.enabled,
  );
  return {
    enabled,
    maxSpreadPips: Math.max(
      0.1,
      parseEnvNumber(process.env.FOREX_MAX_SPREAD_PIPS, DEFAULTS.maxSpreadPips),
    ),
    maxPositions: Math.max(
      1,
      Math.floor(parseEnvNumber(process.env.FOREX_MAX_POSITIONS, DEFAULTS.maxPositions)),
    ),
    riskPct: Math.min(
      5,
      Math.max(0.1, parseEnvNumber(process.env.FOREX_RISK_PCT, DEFAULTS.riskPct)),
    ),
    stopPips: Math.max(1, parseEnvNumber(process.env.FOREX_STOP_PIPS, DEFAULTS.stopPips)),
    tpPips: Math.max(1, parseEnvNumber(process.env.FOREX_TP_PIPS, DEFAULTS.tpPips)),
    minConfidence: Math.min(
      1,
      Math.max(0, parseEnvNumber(process.env.FOREX_MIN_CONFIDENCE, DEFAULTS.minConfidence)),
    ),
    minUnits: Math.max(
      FOREX_MIN_UNITS,
      Math.floor(parseEnvNumber(process.env.FOREX_MIN_UNITS, FOREX_MIN_UNITS)),
    ),
  };
}

export function getForexPair(pairId: string): ForexIbkrContract | null {
  const id = pairId.replace("/", "").toUpperCase() as ForexPairId;
  return FOREX_PAIRS.find((p) => p.pairId === id) ?? null;
}

export function pipSize(pair: ForexIbkrContract | ForexPairId): number {
  const p = typeof pair === "string" ? getForexPair(pair) : pair;
  if (!p) return 0.0001;
  return p.jpyQuoted ? 0.01 : 0.0001;
}

/** Absolute distance in pips between two prices. */
export function priceToPips(
  pair: ForexIbkrContract | ForexPairId,
  fromPrice: number,
  toPrice: number,
): number {
  const size = pipSize(pair);
  if (!Number.isFinite(fromPrice) || !Number.isFinite(toPrice) || size <= 0) return NaN;
  return Math.abs(toPrice - fromPrice) / size;
}

export function pipsToPriceOffset(pair: ForexIbkrContract | ForexPairId, pips: number): number {
  return pipSize(pair) * pips;
}

/**
 * Approximate pip value in quote-currency units for `units` notional.
 * USD-quoted: ~ units * pipSize (USD).
 * JPY-quoted: ~ units * pipSize / mid (USD if converting via mid).
 */
export function pipValueQuoteCurrency(units: number, pair: ForexIbkrContract, midPrice: number): number {
  if (!Number.isFinite(units) || units <= 0) return NaN;
  const size = pipSize(pair);
  if (pair.jpyQuoted) {
    if (!Number.isFinite(midPrice) || midPrice <= 0) return NaN;
    return (units * size) / midPrice;
  }
  if (pair.currency === "USD") {
    return units * size;
  }
  // Cross quoted in GBP/CAD/CHF — return quote-ccy pip value; caller converts to NAV ccy.
  return units * size;
}

export type ForexSlTpLevels = {
  readonly entry: number;
  readonly stopLoss: number;
  readonly takeProfit: number;
  readonly stopPips: number;
  readonly tpPips: number;
  readonly riskReward: number;
};

export function buildSlTpFromPips(params: {
  pair: ForexIbkrContract | ForexPairId;
  side: "BUY" | "SELL";
  entry: number;
  stopPips: number;
  tpPips: number;
}): ForexSlTpLevels | null {
  const { side, entry, stopPips, tpPips } = params;
  if (!Number.isFinite(entry) || entry <= 0 || stopPips <= 0 || tpPips <= 0) return null;
  const offsetStop = pipsToPriceOffset(params.pair, stopPips);
  const offsetTp = pipsToPriceOffset(params.pair, tpPips);
  if (side === "BUY") {
    return {
      entry,
      stopLoss: entry - offsetStop,
      takeProfit: entry + offsetTp,
      stopPips,
      tpPips,
      riskReward: tpPips / stopPips,
    };
  }
  return {
    entry,
    stopLoss: entry + offsetStop,
    takeProfit: entry - offsetTp,
    stopPips,
    tpPips,
    riskReward: tpPips / stopPips,
  };
}

/**
 * Position size in FX units from NAV risk %.
 * riskAmount = nav * (riskPct/100); units ≈ riskAmount / (stopPips * pipValuePerUnit)
 */
export function positionUnitsForRisk(params: {
  nav: number;
  riskPct: number;
  stopPips: number;
  pair: ForexIbkrContract;
  midPrice: number;
  minUnits?: number;
}): { units: number; riskAmount: number; pipValue: number } | null {
  const { nav, riskPct, stopPips, pair, midPrice } = params;
  const minUnits = params.minUnits ?? FOREX_MIN_UNITS;
  if (!Number.isFinite(nav) || nav <= 0 || stopPips <= 0) return null;
  const riskAmount = nav * (riskPct / 100);
  const pipValuePerUnit = pipValueQuoteCurrency(1, pair, midPrice);
  if (!Number.isFinite(pipValuePerUnit) || pipValuePerUnit <= 0) return null;
  const raw = riskAmount / (stopPips * pipValuePerUnit);
  const units = Math.max(minUnits, Math.floor(raw / 1000) * 1000);
  return {
    units,
    riskAmount,
    pipValue: pipValueQuoteCurrency(units, pair, midPrice),
  };
}

export type ForexMadridSession =
  | "TOKYO"
  | "LONDON"
  | "NEW_YORK"
  | "OVERLAP_LONDON_NY"
  | "CLOSED";

export type ForexSessionSnapshot = {
  readonly madridMinutes: number;
  readonly tradingWindowActive: boolean;
  readonly highLiquidity: boolean;
  readonly analysisOnlyOutsideHours: boolean;
  readonly primarySession: ForexMadridSession;
  readonly sessionsOpen: readonly ForexMadridSession[];
  readonly label: string;
};

function madridClockParts(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  const weekday = get("weekday");
  return {
    weekday,
    hour,
    minute,
    madridMinutes: hour * 60 + minute,
    weekend: weekday.startsWith("Sat") || weekday.startsWith("Sun"),
  };
}

function inRange(mins: number, startH: number, startM: number, endH: number, endM: number): boolean {
  const start = startH * 60 + startM;
  const end = endH * 60 + endM;
  return mins >= start && mins < end;
}

/**
 * Sessions in Europe/Madrid wall clock (approx overlays):
 * Tokyo 00:00–09:00 · Londres 08:00–17:00 · NY 13:00–22:00
 * Trading window 07:00–22:00; high liquidity 08:00–10:30 & 15:30–18:00.
 */
export function getForexSessionSnapshot(now = new Date()): ForexSessionSnapshot {
  const local = madridClockParts(now);
  if (local.weekend) {
    return {
      madridMinutes: local.madridMinutes,
      tradingWindowActive: false,
      highLiquidity: false,
      analysisOnlyOutsideHours: true,
      primarySession: "CLOSED",
      sessionsOpen: [],
      label: "Fin de semana — solo análisis",
    };
  }

  const m = local.madridMinutes;
  const tokyo = inRange(m, 0, 0, 9, 0);
  const london = inRange(m, 8, 0, 17, 0);
  const ny = inRange(m, 13, 0, 22, 0);
  const tradingWindowActive = inRange(m, 7, 0, 22, 0);
  const highLiquidity =
    inRange(m, 8, 0, 10, 30) || inRange(m, 15, 30, 18, 0);

  const sessionsOpen: ForexMadridSession[] = [];
  if (tokyo) sessionsOpen.push("TOKYO");
  if (london) sessionsOpen.push("LONDON");
  if (ny) sessionsOpen.push("NEW_YORK");
  if (london && ny) sessionsOpen.push("OVERLAP_LONDON_NY");

  let primarySession: ForexMadridSession = "CLOSED";
  if (london && ny) primarySession = "OVERLAP_LONDON_NY";
  else if (ny) primarySession = "NEW_YORK";
  else if (london) primarySession = "LONDON";
  else if (tokyo) primarySession = "TOKYO";

  return {
    madridMinutes: m,
    tradingWindowActive,
    highLiquidity,
    analysisOnlyOutsideHours: !tradingWindowActive,
    primarySession,
    sessionsOpen,
    label: tradingWindowActive
      ? `Sesión activa · ${primarySession}${highLiquidity ? " · alta liquidez" : ""}`
      : "Fuera de horario 07:00–22:00 — solo análisis",
  };
}

export function spreadPips(pair: ForexIbkrContract | ForexPairId, bid: number, ask: number): number {
  if (!Number.isFinite(bid) || !Number.isFinite(ask) || ask < bid) return NaN;
  return priceToPips(pair, bid, ask);
}

export function isSpreadAcceptable(
  pair: ForexIbkrContract | ForexPairId,
  bid: number,
  ask: number,
  maxSpreadPips: number,
): boolean {
  const s = spreadPips(pair, bid, ask);
  return Number.isFinite(s) && s <= maxSpreadPips;
}

/** Risk policy constants from product spec (also overridable via env). */
export const FOREX_RISK_POLICY = {
  maxStopPips: 20,
  minTakeProfitPips: 40,
  minRiskReward: 2,
  maxConcurrentPairs: 3,
  newsBlackoutMinutes: 30,
  maxRiskPctNav: 2,
  minConfidence: 0.75,
  maxSpreadPips: 3,
  cycleMsActive: 5 * 60 * 1000,
} as const;

export type ForexCorrelationHint = {
  readonly pairId: ForexPairId;
  readonly correlatesWith: string;
  readonly note: string;
};

export const FOREX_CORRELATIONS: readonly ForexCorrelationHint[] = [
  { pairId: "EURUSD", correlatesWith: "DXY", note: "EUR/USD suele moverse inverso al DXY" },
  { pairId: "GBPUSD", correlatesWith: "EURGBP", note: "GBP/USD vs EUR/GBP — divergencias de cable" },
  { pairId: "EURGBP", correlatesWith: "GBPUSD", note: "Cruce europeo vs cable" },
] as const;

export const FOREX_INDICATORS = ["RSI", "MACD", "BOLLINGER", "ATR"] as const;

export const FOREX_AI_PROMPT_HINT = `Eres un analista FOREX intradía IBKR IDEALPRO.
Pares: majors/minors CASH. Usa RSI, MACD, Bollinger, ATR.
Respeta sesiones Tokyo/Londres/NY (hora Madrid), spread, y no operes ±30m de noticias HIGH.
SL máximo 20 pips, TP mínimo 40 pips (R:R ≥ 1:2). Confianza >0.75 para señal actionable.`;
