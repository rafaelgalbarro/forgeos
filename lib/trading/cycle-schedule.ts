/**
 * Madrid-time gates for the 3 independent trading cycles.
 */

import "server-only";

export type MadridClock = {
  hour: number;
  minute: number;
  nowMinutes: number;
  weekend: boolean;
};

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

/** USA stocks cycle: 14:30–22:00 Madrid (USA_REGULAR window). */
export function isUsStocksCycleWindow(now = madridClock()): boolean {
  const open = 14 * 60 + 30;
  const close = 22 * 60;
  return now.nowMinutes >= open && now.nowMinutes < close;
}

/** Forex cycle: 07:00–22:00 Madrid. */
export function isForexCycleWindow(now = madridClock()): boolean {
  return now.hour >= 7 && now.hour < 22;
}

/** Crypto cycle: 24/7. */
export function isCryptoCycleWindow(): boolean {
  return true;
}
