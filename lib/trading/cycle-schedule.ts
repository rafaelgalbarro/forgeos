/**
 * Madrid-time gates + trading phases for 24/7 typed cycles.
 */

import "server-only";

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

export function madridClock(): MadridClock {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const weekday = (parts.find((p) => p.type === "weekday")?.value ?? "Mon").toLowerCase();
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? "0");
  return {
    hour,
    minute,
    nowMinutes: hour * 60 + minute,
    weekend: weekday.startsWith("sat") || weekday.startsWith("sun"),
  };
}

/**
 * getCurrentTradingPhase — Madrid clock:
 * 01:00–08:00 ASIA · 08:00–14:00 EUROPA · 14:00–14:30 PRE_MARKET ·
 * 14:30–22:00 USA_REGULAR · 22:00–01:00 CLOSED
 */
export function getCurrentTradingPhase(now = madridClock()): ForgeTradingPhase {
  const m = now.nowMinutes;
  if (m >= 22 * 60 || m < 1 * 60) return "CLOSED";
  if (m < 8 * 60) return "ASIA";
  if (m < 14 * 60) return "EUROPA";
  if (m < 14 * 60 + 30) return "PRE_MARKET";
  return "USA_REGULAR";
}

export function nextOpenLabel(phase: ForgeTradingPhase = getCurrentTradingPhase()): string {
  if (phase === "CLOSED") return "01:00 ASIA";
  if (phase === "ASIA") return "08:00 EUROPA";
  if (phase === "EUROPA") return "14:00 PRE_MARKET";
  if (phase === "PRE_MARKET") return "14:30 USA_REGULAR";
  return "22:00 CLOSED";
}

/** Stocks cycle runs in all phases except CLOSED. */
export function isUsStocksCycleWindow(now = madridClock()): boolean {
  return getCurrentTradingPhase(now) !== "CLOSED";
}

/** Forex cycle: 07:00–22:00 Madrid. */
export function isForexCycleWindow(now = madridClock()): boolean {
  return now.hour >= 7 && now.hour < 22;
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
