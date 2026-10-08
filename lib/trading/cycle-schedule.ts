/**
 * Trading phase + order windows from exchange-local IANA clocks
 * (not fixed Madrid offsets — correct across US/EU DST mismatches).
 */

import "server-only";

import {
  isContinentalEuropeEquitySession,
  isEuropeanEquityOrderWindow as euWindow,
  isLondonEquitySession,
  isUsListedEquityOrderWindow as usWindow,
  isUsPremarketSession,
  isUsRegularSession,
  zonedClock,
  type ZonedClock,
} from "@/lib/trading/exchange-hours";

export type MadridClock = {
  hour: number;
  minute: number;
  nowMinutes: number;
  weekend: boolean;
};

export type ForgeTradingPhase =
  | "ASIA"
  | "EUROPA"
  | "PRE_MARKET"
  | "USA_REGULAR"
  | "CLOSED";

/** @deprecated Prefer zonedClock / exchange-hours; kept for Madrid-display helpers. */
export function madridClock(at: Date = new Date()): MadridClock {
  const c = zonedClock("Europe/Madrid", at);
  return {
    hour: c.hour,
    minute: c.minute,
    nowMinutes: c.nowMinutes,
    weekend: c.weekend,
  };
}

export function getCurrentTradingPhase(at: Date = new Date()): ForgeTradingPhase {
  if (isUsRegularSession(at)) return "USA_REGULAR";
  if (isUsPremarketSession(at)) return "PRE_MARKET";
  if (isContinentalEuropeEquitySession(at) || isLondonEquitySession(at)) return "EUROPA";

  const ny = zonedClock("America/New_York", at);
  const madrid = zonedClock("Europe/Madrid", at);
  // Overnight / Asia: Madrid 01:00–08:00 or NY evening after EU close
  if (!madrid.weekend && madrid.nowMinutes >= 60 && madrid.nowMinutes < 8 * 60) {
    return "ASIA";
  }
  if (!ny.weekend && ny.nowMinutes >= 18 * 60) {
    // After US close — treat remaining evening as CLOSED for equity entries
    return "CLOSED";
  }
  if (!ny.weekend && ny.nowMinutes < 4 * 60) {
    return "ASIA";
  }
  return "CLOSED";
}

export function nextOpenLabel(phase: ForgeTradingPhase = getCurrentTradingPhase()): string {
  if (phase === "CLOSED") return "ASIA / EU open (exchange-local)";
  if (phase === "ASIA") return "EU 09:00 Madrid / 08:00 London";
  if (phase === "EUROPA") return "US premarket 04:00 ET";
  if (phase === "PRE_MARKET") return "US regular 09:30 ET";
  return "US close 16:00 ET";
}

/** Stocks cycle runs when any equity venue is in session (or Asia seed phase). */
export function isUsStocksCycleWindow(at: Date = new Date()): boolean {
  return getCurrentTradingPhase(at) !== "CLOSED";
}

/** Forex cycle: 07:00–22:00 Madrid (FX desks). */
export function isForexCycleWindow(at: Date = new Date()): boolean {
  const m = zonedClock("Europe/Madrid", at);
  return m.hour >= 7 && m.hour < 22;
}

/**
 * US-listed equities / ADRs — BUY only during NYSE regular (09:30–16:00 America/New_York).
 * Exits (SELL) may still run outside this window.
 */
export function isUsListedEquityOrderWindow(at: Date = new Date()): boolean {
  return usWindow(at);
}

/**
 * European local equities — BUY when Madrid 09:00–17:30 or London 08:00–16:30.
 */
export function isEuropeanEquityOrderWindow(at: Date = new Date()): boolean {
  return euWindow(at);
}

/** Crypto cycle: 24/7. */
export function isCryptoCycleWindow(): boolean {
  return true;
}

/** Min confidence by phase (Risk Manager may raise to 0.80 in conservative mode). */
export function minConfidenceForForgePhase(phase: ForgeTradingPhase, crypto = false): number {
  if (crypto) return 0.5;
  switch (phase) {
    case "PRE_MARKET":
      return 0.62;
    case "ASIA":
    case "EUROPA":
    case "USA_REGULAR":
      return 0.6;
    case "CLOSED":
      return 1;
    default:
      return 0.6;
  }
}

export type { ZonedClock };
