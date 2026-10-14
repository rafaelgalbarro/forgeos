import { describe, expect, it } from "vitest";
import { dateAtLocal, isUsPremarketSession } from "@/lib/trading/exchange-hours";
import { getCurrentTradingPhase } from "@/lib/trading/cycle-schedule";
import {
  getEquityStrategySession,
  isEuropeanEurEquityRegularSession,
  isEuPrimaryExchangeRegularSession,
} from "@/lib/trading/equity-strategy-session";

describe("equity-strategy-session", () => {
  it("12:38 Europe/Madrid — EU local open while US premarket; EU strategies eligible", () => {
    const at = dateAtLocal("Europe/Madrid", 2026, 10, 14, 12, 38);
    expect(isUsPremarketSession(at)).toBe(true);
    expect(getCurrentTradingPhase(at)).toBe("PRE_MARKET");

    expect(isEuPrimaryExchangeRegularSession("BM", at)).toBe(true);
    expect(isEuropeanEurEquityRegularSession("SAN", at)).toBe(true);
    expect(isEuropeanEurEquityRegularSession("SAP", at)).toBe(true);

    const san = getEquityStrategySession("SAN", at);
    expect(san.market).toBe("EU_LOCAL");
    expect(san.regularSessionOpen).toBe(true);
    expect(san.strategyPhase).toBe("EUROPE");
    expect(san.usPhase).toBe("PRE_MARKET");
    expect(san.eligibleStrategyIds).toContain("EU_EMA21_PULLBACK");
    expect(san.swingAnalysisAllowed).toBe(true);

    const sap = getEquityStrategySession("SAP", at);
    expect(sap.timeZone).toBe("Europe/Berlin");
    expect(sap.regularSessionOpen).toBe(true);
    expect(sap.strategyPhase).toBe("EUROPE");
  });

  it("US listing uses NY session — EU strategy ids not enabled by EU local clock alone", () => {
    const at = dateAtLocal("Europe/Madrid", 2026, 10, 14, 12, 38);
    const aapl = getEquityStrategySession("AAPL", at);
    expect(aapl.market).toBe("US_LISTED");
    expect(aapl.usPhase).toBe("PRE_MARKET");
    expect(aapl.strategyPhase).toBe("USA_PREMARKET");
    expect(aapl.eligibleStrategyIds.some((id) => id.startsWith("EU_"))).toBe(false);
  });

  it("AAPL 10:46 ET Wednesday — NY RTH opens all US equity strategies", () => {
    const at = dateAtLocal("America/New_York", 2026, 10, 14, 10, 46);
    const aapl = getEquityStrategySession("AAPL", at);
    expect(aapl.market).toBe("US_LISTED");
    expect(aapl.regularSessionOpen).toBe(true);
    expect(aapl.usPhase).toBe("REGULAR");
    expect(aapl.strategyPhase).toBe("USA_REGULAR");
    expect(aapl.eligibleStrategyIds.length).toBeGreaterThan(0);
    expect(aapl.eligibleStrategyIds).toContain("USA_EODHD_MOMENTUM");
    expect(aapl.eligibleStrategyIds).toContain("USA_GAP_AND_GO");
  });
});
