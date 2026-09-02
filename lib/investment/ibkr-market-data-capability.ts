import "server-only";

/**
 * IBKR market-data capability — documents the read-only history route.
 * Bars are never invented; empty TWS responses remain NO_DATA at the data layer.
 */
export type IbkrMarketDataCapabilitySnapshot = {
  readonly generatedAt: string;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly liveTradingEnabled: false;
  readonly ibkrReadOnly: true;
  /** Route exists and is read-only; actual bars still depend on TWS subscriptions. */
  readonly status: "READ_ONLY_ROUTE";
  readonly availableReadPaths: readonly string[];
  readonly missingPaths: readonly string[];
  readonly note: string;
};

const AVAILABLE = [
  "/health",
  "/api/ibkr/connect",
  "/api/ibkr/status",
  "/api/ibkr/account",
  "/api/ibkr/positions",
  "/api/ibkr/orders",
  "/api/ibkr/history",
] as const;

const MISSING = [
  "/api/ibkr/market-data",
  "/api/ibkr/bars",
  "/api/ibkr/quotes",
] as const;

export function getIbkrMarketDataCapability(): IbkrMarketDataCapabilitySnapshot {
  return {
    generatedAt: new Date().toISOString(),
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    liveTradingEnabled: false,
    ibkrReadOnly: true,
    status: "READ_ONLY_ROUTE",
    availableReadPaths: AVAILABLE,
    missingPaths: MISSING,
    note:
      "READ_ONLY_ROUTE — FastAPI exposes GET /api/ibkr/history via reqHistoricalData (no placeOrder; flags unchanged). " +
      "Empty bars mean TWS timeout/subscription/permissions — ForgeOS never invents OHLC. " +
      "Streaming quotes (/quotes) and generic /market-data remain unavailable.",
  };
}
