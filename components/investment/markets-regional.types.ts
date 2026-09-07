export type MarketTicker = {
  readonly symbol: string;
  readonly name: string;
};

export type MarketRegion = {
  readonly id: string;
  readonly name: string;
  /** Trading hours label in Spanish local time (CET/CEST). */
  readonly hoursLabel: string;
  readonly tickers: readonly MarketTicker[];
};

export const MARKET_REGIONS: readonly MarketRegion[] = [
  {
    id: "usa",
    name: "USA",
    hoursLabel: "15:30 - 22:00",
    tickers: [
      { symbol: "SPY", name: "SPDR S&P 500 ETF" },
      { symbol: "QQQ", name: "Invesco QQQ Trust" },
      { symbol: "AAPL", name: "Apple Inc." },
      { symbol: "NVDA", name: "NVIDIA Corp." },
      { symbol: "TSLA", name: "Tesla Inc." },
    ],
  },
  {
    id: "europa",
    name: "Europa",
    hoursLabel: "09:00 - 17:30",
    tickers: [
      { symbol: "EZU", name: "iShares MSCI Eurozone ETF" },
      { symbol: "ASML", name: "ASML Holding" },
      { symbol: "SAP", name: "SAP SE (ADR)" },
    ],
  },
  {
    id: "asia",
    name: "Asia",
    hoursLabel: "02:00 - 10:00",
    tickers: [
      { symbol: "EWJ", name: "iShares MSCI Japan ETF" },
      { symbol: "FXI", name: "iShares China Large-Cap ETF" },
      { symbol: "TSM", name: "Taiwan Semiconductor" },
      { symbol: "BABA", name: "Alibaba Group" },
    ],
  },
  {
    id: "crypto",
    name: "Crypto 24h",
    hoursLabel: "Siempre abierto",
    tickers: [
      { symbol: "IBIT", name: "iShares Bitcoin Trust" },
      { symbol: "FETH", name: "Fidelity Ethereum Fund" },
      { symbol: "GRAB", name: "Grab Holdings" },
    ],
  },
] as const;

export const ALL_MARKET_TICKERS: readonly MarketTicker[] = MARKET_REGIONS.flatMap(
  (region) => region.tickers,
);

export type IbkrPricePayload = {
  ticker?: string;
  currentPrice?: number;
  previousClose?: number;
  change1d?: number;
  error?: string;
};

export type TickerQuoteState = {
  price: number | null;
  changePct: number | null;
  loading: boolean;
  /** True when showing last close instead of a live quote. */
  isClosing: boolean;
};

export type TradeSignalPayload = {
  ticker: string;
  direction: "BUY" | "SELL" | "HOLD";
  confidence: number;
  reasoning: string;
  suggestedOrderType: "MKT" | "LMT";
  suggestedLimitPrice?: number;
  urgency: "LOW" | "MEDIUM" | "HIGH";
};

export type TickerAnalysisPayload = {
  ticker: string;
  signal: TradeSignalPayload;
  market: {
    currentPrice: number;
    previousClose: number;
    change1d: number;
    high52w: number;
    low52w: number;
    volume: number;
    bid: number;
    ask: number;
  };
  portfolio: {
    navUSD: number;
    cashUSD: number;
    dailyPnlUSD: number;
    existingPosition?: { shares: number; avgCost: number; unrealizedPnl: number };
  };
  analysis?: {
    news: {
      items: Array<{
        title: string;
        source: string;
        sentiment: string;
        hoursAgo: number;
        url?: string;
      }>;
      overallSentiment: string;
      newsCount24h: number;
    };
    technicals: {
      trend: {
        ema9: number | null;
        ema20: number | null;
        ema50: number | null;
        ema200: number | null;
        adx: number | null;
        macd: { line: number; signal: number; histogram: number } | null;
      };
      momentum: {
        rsi: number | null;
        rsiZone: string;
        stochRsi: { k: number; d: number } | null;
        cci: number | null;
        williamsR: number | null;
      };
      volatility: {
        bollingerBands: {
          upper: number;
          middle: number;
          lower: number;
          percentB: number;
          bandwidth: number;
        } | null;
        atr: number | null;
        squeeze: { active: boolean; momentum: number } | null;
      };
      volume: {
        vwap: number | null;
        obv: number | null;
        relativeVolume: number | null;
      };
      levels: {
        support: number[];
        resistance: number[];
        fibonacci: Array<{ level: string; price: number }>;
      };
    };
    patterns: {
      candlesticks: Array<{ name: string; type: string; confidence: number }>;
      price: Array<{ name: string; type: string; confidence: number; targetPrice?: number }>;
      divergences: Array<{ indicator: string; type: string; confidence: number }>;
      signals: Array<{ name: string; description: string; strength: number }>;
    };
    bars: Array<{ open: number; high: number; low: number; close: number; volume: number; date?: string }>;
    computedAt: string;
  } | null;
};

export const MARKETS_POLL_MS = 5 * 60 * 1000;

/** Priority symbols painted first on Acciones (lazy-load the rest). */
export const MARKETS_PRIORITY_SYMBOLS = [
  "SPY",
  "QQQ",
  "AAPL",
  "NVDA",
  "TSLA",
  "ASML",
  "TSM",
  "EZU",
  "IBIT",
  "EWJ",
] as const;
