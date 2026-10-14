/**
 * Per-symbol equity session for strategy activation (EU locals vs US listings).
 * US forge/cycle phases must not gate European local strategies.
 */

import {
  getEuropeanEurEquity,
  isEuropeanEurEquity,
  type EuPrimaryExchange,
} from "@/lib/trading/europe-equities";
import {
  getUsExchangeSession,
  zonedClock,
  type ZonedClock,
} from "@/lib/trading/exchange-hours";
import {
  getActiveTradingPhase,
  isEuropeFocusTicker,
  isEuropeOpen,
  type ActiveTradingPhase,
} from "@/src/core/trading/market-session";
import { getCurrentTradingPhase, type ForgeTradingPhase } from "@/lib/trading/cycle-schedule";

function inRange(minutes: number, startH: number, startM: number, endH: number, endM: number): boolean {
  const start = startH * 60 + startM;
  const end = endH * 60 + endM;
  return minutes >= start && minutes < end;
}

/** IBKR primaryExchange → IANA zone for regular cash session. */
export function euPrimaryExchangeTimeZone(primary: EuPrimaryExchange): string {
  switch (primary) {
    case "BM":
      return "Europe/Madrid";
    case "IBIS":
      return "Europe/Berlin";
    case "AEB":
      return "Europe/Amsterdam";
    case "SBF":
      return "Europe/Paris";
    case "BVME":
      return "Europe/Rome";
    default:
      return "Europe/Madrid";
  }
}

/** Continental EU listings — 09:00–17:30 in the listing's local zone (weekdays). */
export function isEuPrimaryExchangeRegularSession(
  primary: EuPrimaryExchange,
  at: Date = new Date(),
): boolean {
  const tz = euPrimaryExchangeTimeZone(primary);
  const c = zonedClock(tz, at);
  if (c.weekend) return false;
  return inRange(c.nowMinutes, 9, 0, 17, 30);
}

export function isEuropeanEurEquityRegularSession(symbol: string, at: Date = new Date()): boolean {
  const spec = getEuropeanEurEquity(symbol);
  if (!spec) return false;
  return isEuPrimaryExchangeRegularSession(spec.primaryExchange, at);
}

const EU_STRATEGY_IDS = [
  "EU_APERTURA_BREAKOUT",
  "EU_EMA21_PULLBACK",
  "EU_TREND_CONTINUATION",
] as const;

export type EquityStrategyMarket = "EU_LOCAL" | "US_LISTED" | "OTHER";

export type EquityStrategySession = {
  symbol: string;
  market: EquityStrategyMarket;
  /** Strategy timing phase — never US PRE_MARKET for EU locals. */
  strategyPhase: ActiveTradingPhase;
  regularSessionOpen: boolean;
  forgePhase: ForgeTradingPhase;
  madridActivePhase: ActiveTradingPhase;
  /** NYSE/NASDAQ phase — informational for EU locals; drives US listings. */
  usPhase: "PRE_MARKET" | "REGULAR" | "CLOSED";
  exchange?: EuPrimaryExchange;
  venue?: string;
  timeZone: string;
  localTime: string;
  sessionLabel: string;
  /** Strategy ids whose session gate is open for this symbol now. */
  eligibleStrategyIds: string[];
  swingAnalysisAllowed: boolean;
  summary: string;
};

function formatClock(c: ZonedClock): string {
  return `${String(c.hour).padStart(2, "0")}:${String(c.minute).padStart(2, "0")}`;
}

function euStrategyPhase(clock: ZonedClock, open: boolean): ActiveTradingPhase {
  if (!open) return "STANDBY_CRYPTO";
  if (inRange(clock.nowMinutes, 9, 0, 10, 0)) return "EUROPE_OPEN";
  return "EUROPE";
}

function usActivePhaseFromNy(at: Date): ActiveTradingPhase {
  const us = getUsExchangeSession(at);
  if (us.phase === "PRE_MARKET") return "USA_PREMARKET";
  if (us.phase === "REGULAR") {
    const ny = us.clock;
    if (inRange(ny.nowMinutes, 9, 30, 10, 30)) return "USA_OPEN";
    return "USA_REGULAR";
  }
  const madrid = getActiveTradingPhase();
  if (madrid === "USA_AFTERHOURS") return "USA_AFTERHOURS";
  return madrid;
}

function listUsEligibleStrategyIds(phase: ActiveTradingPhase): string[] {
  if (phase === "USA_PREMARKET") return ["USA_GAP_AND_GO", "USA_MOMENTUM_PRIMERA_HORA"];
  if (phase === "USA_OPEN") {
    return [
      "USA_GAP_AND_GO",
      "USA_MOMENTUM_PRIMERA_HORA",
      "USA_VWAP_BOUNCE",
      "USA_REVERSAL_OVERSOLD",
    ];
  }
  if (phase === "USA_REGULAR") {
    return [
      "USA_EODHD_MOMENTUM",
      "USA_BB_OVERSOLD",
      "USA_MACD_CROSS",
      "USA_TREND_FOLLOWING",
      "USA_INVERSE_HS",
      "USA_DOUBLE_BOTTOM",
      "USA_EARNINGS_MOMENTUM",
      "USA_NEWS_CATALYST",
    ];
  }
  if (phase === "USA_AFTERHOURS") return ["AH_EARNINGS"];
  if (phase === "ASIA") return ["ASIA_TREND_NOCTURNO", "ASIA_GOLDEN_CROSS"];
  return [];
}

/**
 * Session context for pro-strategies / cycle diagnostics.
 * EU locals: exchange-local RTH only. US: unchanged (Madrid-timed active phase + NY order window).
 */
export function getEquityStrategySession(symbol: string, at: Date = new Date()): EquityStrategySession {
  const upper = symbol.trim().toUpperCase();
  const forgePhase = getCurrentTradingPhase(at);
  const madridActivePhase = getActiveTradingPhase();
  const us = getUsExchangeSession(at);

  const euSpec = getEuropeanEurEquity(upper);
  if (euSpec) {
    const tz = euPrimaryExchangeTimeZone(euSpec.primaryExchange);
    const clock = zonedClock(tz, at);
    const open = isEuPrimaryExchangeRegularSession(euSpec.primaryExchange, at);
    const strategyPhase = euStrategyPhase(clock, open);
    const eligibleStrategyIds = open ? [...EU_STRATEGY_IDS] : [];
    const summary =
      `EU_LOCAL ${euSpec.venue}/${euSpec.primaryExchange} ${formatClock(clock)} ${tz} ` +
      `open=${open} usPhase=${us.phase} forge=${forgePhase} eligible=[${eligibleStrategyIds.join(",")}]`;

    return {
      symbol: upper,
      market: "EU_LOCAL",
      strategyPhase,
      regularSessionOpen: open,
      forgePhase,
      madridActivePhase,
      usPhase: us.phase,
      exchange: euSpec.primaryExchange,
      venue: euSpec.venue,
      timeZone: tz,
      localTime: formatClock(clock),
      sessionLabel: `09:00–17:30 ${tz}`,
      eligibleStrategyIds,
      swingAnalysisAllowed: open,
      summary,
    };
  }

  const strategyPhase = usActivePhaseFromNy(at);
  const usRegular = us.phase === "REGULAR";
  const usPremarket = us.phase === "PRE_MARKET";
  const europeAdrContext =
    isEuropeFocusTicker(upper) && isEuropeOpen() && !usRegular && !usPremarket;
  const eligibleStrategyIds = [
    ...listUsEligibleStrategyIds(strategyPhase),
    ...(europeAdrContext ? [...EU_STRATEGY_IDS] : []),
  ];
  const regularSessionOpen = usRegular || usPremarket;
  const summary =
    `US_LISTED ${formatClock(us.clock)} America/New_York usPhase=${us.phase} ` +
    `strategyPhase=${strategyPhase} forge=${forgePhase} eligible=[${eligibleStrategyIds.join(",")}]`;

  return {
    symbol: upper,
    market: "US_LISTED",
    strategyPhase,
    regularSessionOpen,
    forgePhase,
    madridActivePhase,
    usPhase: us.phase,
    timeZone: "America/New_York",
    localTime: formatClock(us.clock),
    sessionLabel: us.phase === "REGULAR" ? "09:30–16:00 ET" : us.phase === "PRE_MARKET" ? "04:00–09:30 ET" : "NYSE closed",
    eligibleStrategyIds,
    swingAnalysisAllowed:
      usRegular || usPremarket || forgePhase === "USA_REGULAR" || forgePhase === "EUROPA" || forgePhase === "PRE_MARKET",
    summary,
  };
}

export function isUsListedSymbol(symbol: string): boolean {
  return !isEuropeanEurEquity(symbol);
}

/** Human-readable hold when no strategy hits — explains session vs signal miss. */
export function formatNoStrategyHoldReason(session: EquityStrategySession, globalPhase: ActiveTradingPhase): string {
  if (session.market === "EU_LOCAL" && !session.regularSessionOpen) {
    return (
      `Fuera de sesión ${session.venue ?? "EU"} (${session.localTime} ${session.timeZone}; ` +
      `${session.sessionLabel}) — usPhase=${session.usPhase} no aplica`
    );
  }
  const eligible =
    session.eligibleStrategyIds.length > 0
      ? session.eligibleStrategyIds.join(", ")
      : "ninguna (sesión US/EU cerrada para este listing)";
  return (
    `Ninguna estrategia activa en sesión — mercado=${session.market} local=${session.localTime} ${session.timeZone} ` +
    `open=${session.regularSessionOpen} fase=${globalPhase} elegibles=[${eligible}]`
  );
}

export function minConfidencePhaseForSession(session: EquityStrategySession): string {
  if (session.market === "EU_LOCAL") {
    return session.strategyPhase;
  }
  return session.strategyPhase;
}
