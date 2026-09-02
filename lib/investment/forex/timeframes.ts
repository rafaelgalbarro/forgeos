/**
 * FOREX OHLCV timeframes — IBKR IDEALPRO + Yahoo FX (=X) fallback mapping.
 */

export const FOREX_TIMEFRAMES = ["1m", "5m", "15m", "1h", "4h", "1d"] as const;
export type ForexTimeframe = (typeof FOREX_TIMEFRAMES)[number];

export type ForexTfSpec = {
  readonly id: ForexTimeframe;
  readonly label: string;
  /** IBKR reqHistoricalData barSize */
  readonly ibkrBarSize: string;
  /** IBKR duration string */
  readonly ibkrDuration: string;
  /** Yahoo chart interval (4h aggregated from 60m) */
  readonly yahooInterval: "1m" | "5m" | "15m" | "60m" | "1d";
  readonly yahooRange: string;
  /** Aggregate N Yahoo bars into one candle (4h = 4×60m). */
  readonly aggregate: number;
};

export const FOREX_TF_SPECS: Record<ForexTimeframe, ForexTfSpec> = {
  "1m": {
    id: "1m",
    label: "1m",
    ibkrBarSize: "1 min",
    ibkrDuration: "1 D",
    yahooInterval: "1m",
    yahooRange: "1d",
    aggregate: 1,
  },
  "5m": {
    id: "5m",
    label: "5m",
    ibkrBarSize: "5 mins",
    ibkrDuration: "5 D",
    yahooInterval: "5m",
    yahooRange: "5d",
    aggregate: 1,
  },
  "15m": {
    id: "15m",
    label: "15m",
    ibkrBarSize: "15 mins",
    ibkrDuration: "5 D",
    yahooInterval: "15m",
    yahooRange: "5d",
    aggregate: 1,
  },
  "1h": {
    id: "1h",
    label: "1H",
    ibkrBarSize: "1 hour",
    ibkrDuration: "1 M",
    yahooInterval: "60m",
    yahooRange: "1mo",
    aggregate: 1,
  },
  "4h": {
    id: "4h",
    label: "4H",
    ibkrBarSize: "4 hours",
    ibkrDuration: "1 M",
    yahooInterval: "60m",
    yahooRange: "3mo",
    aggregate: 4,
  },
  "1d": {
    id: "1d",
    label: "1D",
    ibkrBarSize: "1 day",
    ibkrDuration: "6 M",
    yahooInterval: "1d",
    yahooRange: "6mo",
    aggregate: 1,
  },
};

export function parseForexTimeframe(raw: string | null | undefined): ForexTimeframe {
  const id = (raw ?? "5m").trim().toLowerCase();
  if ((FOREX_TIMEFRAMES as readonly string[]).includes(id)) return id as ForexTimeframe;
  return "5m";
}
