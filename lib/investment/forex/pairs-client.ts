/**
 * Client-safe FOREX pair list (no process.env / server-only imports).
 */

export const FOREX_PAIR_OPTIONS = [
  { id: "EURUSD", label: "EUR/USD" },
  { id: "GBPUSD", label: "GBP/USD" },
  { id: "USDJPY", label: "USD/JPY" },
  { id: "USDCHF", label: "USD/CHF" },
  { id: "AUDUSD", label: "AUD/USD" },
  { id: "USDCAD", label: "USD/CAD" },
  { id: "EURGBP", label: "EUR/GBP" },
  { id: "EURJPY", label: "EUR/JPY" },
  { id: "GBPJPY", label: "GBP/JPY" },
] as const;

export type ForexPairOptionId = (typeof FOREX_PAIR_OPTIONS)[number]["id"];
