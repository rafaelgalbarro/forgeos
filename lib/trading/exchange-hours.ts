/**
 * Exchange-local session clocks (IANA time zones).
 * Correct across US/EU DST mismatches (spring/fall).
 */

export type ZonedClock = {
  timeZone: string;
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
  nowMinutes: number;
  weekday: string; // short en-US: Mon, Tue, …
  weekend: boolean;
  dateKey: string; // YYYY-MM-DD in that zone
};

/** NYSE full-day closures (observed dates). */
const NYSE_HOLIDAYS = new Set([
  // 2024
  "2024-01-01", "2024-01-15", "2024-02-19", "2024-03-29", "2024-05-27",
  "2024-06-19", "2024-07-04", "2024-09-02", "2024-11-28", "2024-12-25",
  // 2025
  "2025-01-01", "2025-01-20", "2025-02-17", "2025-04-18", "2025-05-26",
  "2025-06-19", "2025-07-04", "2025-09-01", "2025-11-27", "2025-12-25",
  // 2026
  "2026-01-01", "2026-01-19", "2026-02-16", "2026-04-03", "2026-05-25",
  "2026-06-19", "2026-07-03", "2026-09-07", "2026-11-26", "2026-12-25",
  // 2027
  "2027-01-01", "2027-01-18", "2027-02-15", "2027-03-26", "2027-05-31",
  "2027-06-18", "2027-07-05", "2027-09-06", "2027-11-25", "2027-12-24",
]);

export function zonedClock(timeZone: string, at: Date = new Date()): ZonedClock {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = fmt.formatToParts(at);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "0";
  const weekday = get("weekday");
  const year = Number(get("year"));
  const month = Number(get("month"));
  const day = Number(get("day"));
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  const dateKey = `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
  return {
    timeZone,
    year,
    month,
    day,
    hour,
    minute,
    nowMinutes: hour * 60 + minute,
    weekday,
    weekend: weekday === "Sat" || weekday === "Sun",
    dateKey,
  };
}

export function isNyseHoliday(dateKey: string): boolean {
  return NYSE_HOLIDAYS.has(dateKey);
}

function inRange(minutes: number, startH: number, startM: number, endH: number, endM: number): boolean {
  const start = startH * 60 + startM;
  const end = endH * 60 + endM;
  return minutes >= start && minutes < end;
}

/** America/New_York — premarket 04:00–09:30 (weekday, not NYSE holiday). */
export function isUsPremarketSession(at: Date = new Date()): boolean {
  const c = zonedClock("America/New_York", at);
  if (c.weekend || isNyseHoliday(c.dateKey)) return false;
  return inRange(c.nowMinutes, 4, 0, 9, 30);
}

/** America/New_York — regular 09:30–16:00 (weekday, not NYSE holiday). */
export function isUsRegularSession(at: Date = new Date()): boolean {
  const c = zonedClock("America/New_York", at);
  if (c.weekend || isNyseHoliday(c.dateKey)) return false;
  return inRange(c.nowMinutes, 9, 30, 16, 0);
}

/** US-listed equity / ADR BUY entries — only NYSE regular. */
export function isUsListedEquityOrderWindow(at: Date = new Date()): boolean {
  return isUsRegularSession(at);
}

/** First 15 minutes of US regular (09:30–09:45 ET). */
export function isUsRegularFirstQuarterHour(at: Date = new Date()): boolean {
  const c = zonedClock("America/New_York", at);
  if (c.weekend || isNyseHoliday(c.dateKey)) return false;
  return inRange(c.nowMinutes, 9, 30, 9, 45);
}

/** BME / Xetra / Euronext continental — Europe/Madrid 09:00–17:30 weekdays. */
export function isContinentalEuropeEquitySession(at: Date = new Date()): boolean {
  const c = zonedClock("Europe/Madrid", at);
  if (c.weekend) return false;
  return inRange(c.nowMinutes, 9, 0, 17, 30);
}

/** LSE — Europe/London 08:00–16:30 weekdays. */
export function isLondonEquitySession(at: Date = new Date()): boolean {
  const c = zonedClock("Europe/London", at);
  if (c.weekend) return false;
  return inRange(c.nowMinutes, 8, 0, 16, 30);
}

/** European local EUR equities — Madrid OR London session open. */
export function isEuropeanEquityOrderWindow(at: Date = new Date()): boolean {
  return isContinentalEuropeEquitySession(at) || isLondonEquitySession(at);
}

export type UsSessionPhase = "PRE_MARKET" | "REGULAR" | "CLOSED";

export function getUsExchangeSession(at: Date = new Date()): {
  phase: UsSessionPhase;
  clock: ZonedClock;
  isTradeableRegular: boolean;
  isPremarket: boolean;
} {
  const clock = zonedClock("America/New_York", at);
  if (clock.weekend || isNyseHoliday(clock.dateKey)) {
    return { phase: "CLOSED", clock, isTradeableRegular: false, isPremarket: false };
  }
  if (isUsPremarketSession(at)) {
    return { phase: "PRE_MARKET", clock, isTradeableRegular: false, isPremarket: true };
  }
  if (isUsRegularSession(at)) {
    return { phase: "REGULAR", clock, isTradeableRegular: true, isPremarket: false };
  }
  return { phase: "CLOSED", clock, isTradeableRegular: false, isPremarket: false };
}

/**
 * Build a Date for an instant that maps to local wall-clock in `timeZone`.
 */
export function dateAtLocal(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): Date {
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, 0);
  for (let i = 0; i < 8; i += 1) {
    const c = zonedClock(timeZone, new Date(utcMs));
    const wantDay = Date.UTC(year, month - 1, day) / 86_400_000;
    const gotDay = Date.UTC(c.year, c.month - 1, c.day) / 86_400_000;
    const dayDeltaMin = (wantDay - gotDay) * 24 * 60;
    const minDelta = hour * 60 + minute - c.nowMinutes + dayDeltaMin;
    if (Math.abs(minDelta) < 0.5 && c.year === year && c.month === month && c.day === day) {
      return new Date(utcMs);
    }
    utcMs += minDelta * 60_000;
  }
  const final = new Date(utcMs);
  const check = zonedClock(timeZone, final);
  if (
    check.year === year &&
    check.month === month &&
    check.day === day &&
    check.hour === hour &&
    check.minute === minute
  ) {
    return final;
  }
  throw new Error(
    `dateAtLocal: no UTC instant for ${timeZone} ${year}-${month}-${day} ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  );
}
