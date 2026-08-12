import type { PaperTradingConfig } from "./domain";

export function createPaperTradingConfigFromEnv(flags = process.env): PaperTradingConfig {
  const startingEquity = Number(flags.PAPER_STARTING_EQUITY ?? 100_000);
  const riskFreeRate = Number(flags.PAPER_RISK_FREE_RATE ?? 0);
  const certificationWindowDays = Number(flags.PAPER_CERTIFICATION_WINDOW_DAYS ?? 30);
  const minimumClosedTrades = Number(flags.PAPER_CERTIFICATION_MIN_TRADES ?? 100);
  return {
    tradingMode: "paper",
    liveTradingEnabled: flags.LIVE_TRADING_ENABLED === "true",
    analysisOnlyUi: true,
    startingEquity: Number.isFinite(startingEquity) && startingEquity > 0 ? startingEquity : 100_000,
    riskFreeRate: Number.isFinite(riskFreeRate) ? riskFreeRate : 0,
    certificationWindowDays:
      Number.isFinite(certificationWindowDays) && certificationWindowDays > 0 ? certificationWindowDays : 30,
    minimumClosedTrades:
      Number.isFinite(minimumClosedTrades) && minimumClosedTrades > 0 ? minimumClosedTrades : 100,
  };
}

/**
 * Hard safety: paper trading must never activate live mode.
 */
export function assertPaperTradingSafe(config: PaperTradingConfig, flags = process.env): void {
  const tradingMode = (flags.TRADING_MODE ?? "paper").toLowerCase();
  if (tradingMode !== "paper" && flags.LIVE_TRADING_ENABLED === "true") {
    throw new Error("Paper trading orchestrator refuses to run while LIVE_TRADING_ENABLED=true.");
  }
  if (config.liveTradingEnabled) {
    throw new Error("Paper trading requires LIVE_TRADING_ENABLED=false.");
  }
  if (flags.LIVE_TRADING_ENABLED === "true") {
    throw new Error("LIVE_TRADING_ENABLED must remain false for institutional paper trading.");
  }
}

export function assertNeverActivatesLive(flags = process.env): void {
  if (flags.LIVE_TRADING_ENABLED === "true") {
    throw new Error("Refusing to mutate LIVE_TRADING_ENABLED — live activation is forbidden.");
  }
}
