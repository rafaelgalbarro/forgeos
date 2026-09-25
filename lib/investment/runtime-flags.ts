/**
 * Server-side investment runtime flags from process.env / .env.local.
 * Static process.env.* reads so Next.js loads them reliably.
 */

function parseBool(raw: string | undefined, fallback: boolean): boolean {
  if (raw == null || raw.trim() === "") return fallback;
  const v = raw.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(v)) return true;
  if (["0", "false", "no", "off"].includes(v)) return false;
  return fallback;
}

export type InvestmentRuntimeFlags = {
  readonly liveTradingEnabled: boolean;
  readonly ibkrReadOnly: boolean;
  readonly forexEnabled: boolean;
  readonly paperTrading: boolean;
  readonly tradingMode: string;
  readonly modeLabel: "ANALYSIS_ONLY" | "LIVE";
  readonly orderExecution: "disabled" | "enabled";
};

/** Snapshot of live/forex/read-only gates for APIs and dashboards. */
export function getInvestmentRuntimeFlags(): InvestmentRuntimeFlags {
  const liveTradingEnabled = parseBool(process.env.LIVE_TRADING_ENABLED, false);
  const ibkrReadOnly = parseBool(process.env.IBKR_READ_ONLY, !liveTradingEnabled);
  const forexEnabled = parseBool(
    process.env.FOREX_ENABLED ?? process.env.ALLOW_FOREX,
    false,
  );
  const tradingMode = (
    process.env.TRADING_MODE?.trim() ||
    (liveTradingEnabled ? "live" : "ANALYSIS_ONLY")
  ).trim();
  const paperTrading = parseBool(
    process.env.PAPER_TRADING,
    !liveTradingEnabled || ibkrReadOnly,
  );
  const ordersLive = liveTradingEnabled && !ibkrReadOnly && !paperTrading;

  return {
    liveTradingEnabled,
    ibkrReadOnly,
    forexEnabled,
    paperTrading,
    tradingMode,
    modeLabel: ordersLive ? "LIVE" : "ANALYSIS_ONLY",
    orderExecution: ordersLive ? "enabled" : "disabled",
  };
}

export function isForexModuleEnabled(): boolean {
  return getInvestmentRuntimeFlags().forexEnabled;
}

export function isLiveTradingEnabled(): boolean {
  return getInvestmentRuntimeFlags().liveTradingEnabled;
}
