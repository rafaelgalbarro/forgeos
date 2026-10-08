import { describe, expect, it } from "vitest";
import {
  dateAtLocal,
  isEuropeanEquityOrderWindow,
  isLondonEquitySession,
  isContinentalEuropeEquitySession,
  isNyseHoliday,
  isUsListedEquityOrderWindow,
  isUsPremarketSession,
  isUsRegularSession,
  zonedClock,
} from "@/lib/trading/exchange-hours";
import { getCurrentTradingPhase } from "@/lib/trading/cycle-schedule";

describe("exchange-hours IANA clocks", () => {
  it("NYSE holiday closes US regular", () => {
    // Thanksgiving 2026-11-26
    expect(isNyseHoliday("2026-11-26")).toBe(true);
    const at = dateAtLocal("America/New_York", 2026, 11, 26, 12, 0);
    expect(isUsRegularSession(at)).toBe(false);
    expect(isUsListedEquityOrderWindow(at)).toBe(false);
  });

  it("March DST mismatch: US already EDT, Europe still CET", () => {
    // 2026-03-16 (Mon) — US DST started Mar 8; EU starts Mar 29
    // 10:00 America/New_York (EDT) = regular
    const usRegular = dateAtLocal("America/New_York", 2026, 3, 16, 10, 0);
    expect(isUsRegularSession(usRegular)).toBe(true);
    expect(isUsListedEquityOrderWindow(usRegular)).toBe(true);
    expect(getCurrentTradingPhase(usRegular)).toBe("USA_REGULAR");

    // 08:00 ET = still premarket
    const usPre = dateAtLocal("America/New_York", 2026, 3, 16, 8, 0);
    expect(isUsPremarketSession(usPre)).toBe(true);
    expect(isUsListedEquityOrderWindow(usPre)).toBe(false);
    expect(getCurrentTradingPhase(usPre)).toBe("PRE_MARKET");

    // 10:00 Europe/Madrid (CET) — EU open, US still premarket (05:00 ET)
    const madridMorning = dateAtLocal("Europe/Madrid", 2026, 3, 16, 10, 0);
    expect(isContinentalEuropeEquitySession(madridMorning)).toBe(true);
    expect(isEuropeanEquityOrderWindow(madridMorning)).toBe(true);
    // Same instant: NY should be 05:00 EDT (premarket)
    const nyAtSame = zonedClock("America/New_York", madridMorning);
    expect(nyAtSame.hour).toBe(5);
    expect(isUsListedEquityOrderWindow(madridMorning)).toBe(false);
    // US premarket takes phase priority; EU entries still allowed via European window
    expect(getCurrentTradingPhase(madridMorning)).toBe("PRE_MARKET");
    expect(isEuropeanEquityOrderWindow(madridMorning)).toBe(true);
  });

  it("October DST mismatch: Europe already CET, US still EDT", () => {
    // 2026-10-28 — EU DST ended Oct 25; US ends Nov 1
    // 15:00 Madrid CET → EU open
    const madrid = dateAtLocal("Europe/Madrid", 2026, 10, 28, 15, 0);
    expect(isContinentalEuropeEquitySession(madrid)).toBe(true);
    // Same instant in NY: 10:00 EDT (regular)
    const ny = zonedClock("America/New_York", madrid);
    expect(ny.hour).toBe(10);
    expect(isUsRegularSession(madrid)).toBe(true);
    expect(getCurrentTradingPhase(madrid)).toBe("USA_REGULAR");

    // London 08:30 BST? After EU fall-back Oct 25 → GMT: 08:30 London open
    const london = dateAtLocal("Europe/London", 2026, 10, 28, 8, 30);
    expect(isLondonEquitySession(london)).toBe(true);
    expect(isEuropeanEquityOrderWindow(london)).toBe(true);
  });

  it("November after both DST ended: EST vs CET offsets", () => {
    // 2026-11-05 — both standard time
    // 09:45 ET = regular (entries OK)
    const usOpen = dateAtLocal("America/New_York", 2026, 11, 5, 9, 45);
    expect(isUsRegularSession(usOpen)).toBe(true);
    expect(isUsListedEquityOrderWindow(usOpen)).toBe(true);

    // 09:00 ET = still premarket → no US entries
    const usPre = dateAtLocal("America/New_York", 2026, 11, 5, 9, 0);
    expect(isUsPremarketSession(usPre)).toBe(true);
    expect(isUsListedEquityOrderWindow(usPre)).toBe(false);

    // 16:00 ET = closed for regular entries
    const usClose = dateAtLocal("America/New_York", 2026, 11, 5, 16, 0);
    expect(isUsRegularSession(usClose)).toBe(false);
    expect(isUsListedEquityOrderWindow(usClose)).toBe(false);

    // Madrid 17:00 still EU open; 17:30 closed
    const euOpen = dateAtLocal("Europe/Madrid", 2026, 11, 5, 17, 0);
    expect(isContinentalEuropeEquitySession(euOpen)).toBe(true);
    const euClose = dateAtLocal("Europe/Madrid", 2026, 11, 5, 17, 30);
    expect(isContinentalEuropeEquitySession(euClose)).toBe(false);
  });

  it("weekend blocks all equity order windows", () => {
    const satNy = dateAtLocal("America/New_York", 2026, 3, 14, 12, 0);
    expect(isUsRegularSession(satNy)).toBe(false);
    const satMad = dateAtLocal("Europe/Madrid", 2026, 3, 14, 12, 0);
    expect(isEuropeanEquityOrderWindow(satMad)).toBe(false);
  });
});
