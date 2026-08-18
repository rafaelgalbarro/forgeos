/**
 * Browser-safe FOREX dashboard types (no server-only imports).
 */

export type ForexQuoteRow = {
  pairId: string;
  display: string;
  bid: number | null;
  ask: number | null;
  mid: number | null;
  spreadPips: number | null;
  source: "POLYGON" | "IBKR" | "YAHOO" | "NO_DATA";
  updatedAt?: string;
};

export type ForexCandleView = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type ForexTimeframeId = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

export type ForexIndicatorsView = {
  rsi: number | null;
  macd: number | null;
  macdSignal: number | null;
  macdHist: number | null;
  bollingerMid: number | null;
  bollingerUpper: number | null;
  bollingerLower: number | null;
  atr: number | null;
  barCount: number;
};

export type ForexPairAnalysisView = {
  pairId: string;
  display: string;
  quote: ForexQuoteRow;
  indicators: ForexIndicatorsView;
  signal: { side: "BUY" | "SELL" | "HOLD"; confidence: number; reasons: string[] };
  levels: {
    entry: number;
    stopLoss: number;
    takeProfit: number;
    stopPips: number;
    tpPips: number;
    riskReward: number;
  } | null;
};

export type ForexDashboardSnapshotView = {
  generatedAt: string;
  mode: "ANALYSIS_ONLY" | "STAGED" | "LIVE_GATED";
  forexEnabled: boolean;
  session: {
    tradingWindowActive: boolean;
    highLiquidity: boolean;
    primarySession: string;
    sessionsOpen: readonly string[];
    label: string;
  };
  config: {
    enabled?: boolean;
    maxPositions: number;
    stopPips: number;
    tpPips: number;
    minConfidence: number;
    maxSpreadPips: number;
  };
  quotes: ForexQuoteRow[];
  analyses: ForexPairAnalysisView[];
  positions: unknown[];
  macro: {
    events: Array<{ title: string; at: string; highImpact: boolean }>;
    blackoutActive: boolean;
    nextHighImpactAt: string | null;
    minutesToNextHigh: number | null;
  };
  pnl: { pips: number | null; eurEstimate: number | null; note: string };
  errors: string[];
};
