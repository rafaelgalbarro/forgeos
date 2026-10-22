/** London-time session windows for intraday FX (pure). */

function londonParts(at: Date): { weekday: number; minutes: number; ymd: string } {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(at).map((p) => [p.type, p.value]));
  const wd = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(parts.weekday ?? "");
  const h = Number(parts.hour) % 24;
  const m = Number(parts.minute);
  return { weekday: wd, minutes: h * 60 + m, ymd: `${parts.year}-${parts.month}-${parts.day}` };
}

export function londonDayKey(at: Date = new Date()): string {
  return londonParts(at).ymd;
}

export type FxSessionMode = "24h" | "london";

/** FOREX_BOT_SESSION=24h (default) | london. */
export function fxSessionMode(): FxSessionMode {
  return (process.env.FOREX_BOT_SESSION ?? "24h").trim().toLowerCase() === "london" ? "london" : "24h";
}

/**
 * Entries allowed.
 *  london: Mon–Fri 07:00–16:30 London (Fri until 14:00).
 *  24h:    Sun 23:00 → Fri 19:00 London, except the daily rollover 21:00–23:00 (wide spreads).
 */
export function isFxEntryWindow(at: Date = new Date(), mode: FxSessionMode = fxSessionMode()): boolean {
  const { weekday, minutes } = londonParts(at);
  if (mode === "london") {
    if (weekday < 1 || weekday > 5) return false;
    if (weekday === 5) return minutes >= 7 * 60 && minutes < 14 * 60;
    return minutes >= 7 * 60 && minutes < 16 * 60 + 30;
  }
  if (weekday === 6) return false;
  if (weekday === 0) return minutes >= 23 * 60;
  if (minutes >= 21 * 60 && minutes < 23 * 60) return false;
  if (weekday === 5) return minutes < 19 * 60;
  return true;
}

/** London-breakout window: 07:00–10:00 London, Mon–Fri. */
export function isLondonOpenWindow(at: Date = new Date()): boolean {
  const { weekday, minutes } = londonParts(at);
  return weekday >= 1 && weekday <= 5 && minutes >= 7 * 60 && minutes < 10 * 60;
}

/** Flatten everything before the weekend: Fri ≥ 20:00 London (and any Sat/Sun). */
export function isWeekendFlattenTime(at: Date = new Date()): boolean {
  const { weekday, minutes } = londonParts(at);
  if (weekday === 6 || weekday === 0) return true;
  return weekday === 5 && minutes >= 20 * 60;
}

/** Epoch seconds of today's 00:00 and 07:00 London (Asian range window), for a given time. */
export function asianRangeBounds(at: Date): { from: number; to: number } {
  const { minutes } = londonParts(at);
  const nowSec = Math.floor(at.getTime() / 1000);
  const midnight = nowSec - minutes * 60 - (Math.floor(at.getTime() / 1000) % 60);
  return { from: midnight, to: midnight + 7 * 3600 };
}

export function londonMinutes(at: Date): number {
  return londonParts(at).minutes;
}

export function londonWeekday(at: Date): number {
  return londonParts(at).weekday;
}
