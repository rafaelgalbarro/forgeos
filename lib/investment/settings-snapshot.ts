import "server-only";

import { getMarketIntelligenceStatus } from "@/lib/investment/market-intelligence-status";
import { getIbkrMarketDataCapability } from "@/lib/investment/ibkr-market-data-capability";

export type KeyPresenceRow = {
  readonly envName: string;
  readonly present: boolean;
  /** Never includes the secret value */
  readonly kind: "api_key" | "flag" | "list";
};

export type InvestmentSettingsSnapshot = {
  readonly generatedAt: string;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly liveTradingEnabled: false;
  readonly ibkrReadOnly: true;
  readonly autonomousLive: "LOCKED";
  readonly tradingMode: string;
  readonly safety: {
    readonly liveTradingEnabled: false;
    readonly ibkrReadOnly: true;
    readonly analysisOnly: true;
    readonly autonomousLive: "LOCKED";
  };
  readonly keyPresence: readonly KeyPresenceRow[];
  readonly mi: ReturnType<typeof getMarketIntelligenceStatus>;
  readonly ibkrMarketData: ReturnType<typeof getIbkrMarketDataCapability>;
  readonly note: string;
};

function present(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function isTruthy(value: string | undefined): boolean {
  if (!value) return false;
  const n = value.trim().toLowerCase();
  return n === "1" || n === "true" || n === "yes" || n === "on";
}

/**
 * Settings snapshot — key presence only (never secret values).
 */
export function getInvestmentSettingsSnapshot(
  env: NodeJS.ProcessEnv = process.env,
): InvestmentSettingsSnapshot {
  const keyPresence: KeyPresenceRow[] = [
    { envName: "POLYGON_API_KEY", present: present(env.POLYGON_API_KEY), kind: "api_key" },
    { envName: "FINNHUB_API_KEY", present: present(env.FINNHUB_API_KEY), kind: "api_key" },
    { envName: "ALPHA_VANTAGE_API_KEY", present: present(env.ALPHA_VANTAGE_API_KEY), kind: "api_key" },
    { envName: "FMP_API_KEY", present: present(env.FMP_API_KEY), kind: "api_key" },
    { envName: "TWELVE_DATA_API_KEY", present: present(env.TWELVE_DATA_API_KEY), kind: "api_key" },
    { envName: "NEWSAPI_KEY", present: present(env.NEWSAPI_KEY), kind: "api_key" },
    { envName: "FRED_API_KEY", present: present(env.FRED_API_KEY), kind: "api_key" },
    { envName: "IBKR_INTERNAL_API_KEY", present: present(env.IBKR_INTERNAL_API_KEY), kind: "api_key" },
    { envName: "ECB_ENABLED", present: isTruthy(env.ECB_ENABLED), kind: "flag" },
    { envName: "WORLDBANK_ENABLED", present: isTruthy(env.WORLDBANK_ENABLED), kind: "flag" },
    { envName: "YAHOO_FINANCE_ENABLED", present: isTruthy(env.YAHOO_FINANCE_ENABLED), kind: "flag" },
    { envName: "RSS_FEED_URLS", present: present(env.RSS_FEED_URLS), kind: "list" },
    {
      envName: "FORGEOS_BENCHMARK_SYMBOL",
      present: present(env.FORGEOS_BENCHMARK_SYMBOL),
      kind: "flag",
    },
    {
      envName: "FORGEOS_BENCHMARK_SYMBOLS",
      present: present(env.FORGEOS_BENCHMARK_SYMBOLS),
      kind: "list",
    },
    {
      envName: "FORGEOS_MARKET_PROVIDERS",
      present: present(env.FORGEOS_MARKET_PROVIDERS),
      kind: "list",
    },
  ];

  const mi = getMarketIntelligenceStatus(env);
  const ibkrMarketData = getIbkrMarketDataCapability();

  return {
    generatedAt: new Date().toISOString(),
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    liveTradingEnabled: false,
    ibkrReadOnly: true,
    autonomousLive: "LOCKED",
    tradingMode: env.TRADING_MODE?.trim() || "ANALYSIS_ONLY",
    safety: {
      liveTradingEnabled: false,
      ibkrReadOnly: true,
      analysisOnly: true,
      autonomousLive: "LOCKED",
    },
    keyPresence,
    mi,
    ibkrMarketData,
    note: "Secret values never displayed — presence flags only. LIVE unlock not available from this page.",
  };
}
