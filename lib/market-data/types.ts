export type OhlcvBar = {
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
  readonly date?: string;
};

export type SentimentLabel = "POSITIVE" | "NEGATIVE" | "NEUTRAL";
export type PatternDirection = "BULLISH" | "BEARISH" | "NEUTRAL";

export type NewsItem = {
  readonly title: string;
  readonly source: string;
  readonly url?: string;
  readonly publishedAt: string;
  readonly hoursAgo: number;
  readonly sentiment: SentimentLabel;
  readonly sentimentScore: number;
};

export type NewsAggregate = {
  readonly items: readonly NewsItem[];
  readonly overallSentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  readonly newsCount24h: number;
  readonly sourcesUsed: readonly string[];
  readonly errors: readonly string[];
};

export type TechnicalTrend = {
  readonly ema9: number | null;
  readonly ema20: number | null;
  readonly ema50: number | null;
  readonly ema200: number | null;
  readonly macd: { line: number; signal: number; histogram: number } | null;
  readonly ichimoku: {
    tenkan: number;
    kijun: number;
    senkouA: number;
    senkouB: number;
    cloudTop: number;
    cloudBottom: number;
    aboveCloud: boolean;
  } | null;
  readonly adx: number | null;
};

export type TechnicalMomentum = {
  readonly rsi: number | null;
  readonly rsiZone: "OVERSOLD" | "OVERBOUGHT" | "NEUTRAL";
  readonly stochRsi: { k: number; d: number } | null;
  readonly cci: number | null;
  readonly williamsR: number | null;
};

export type TechnicalVolatility = {
  readonly bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
    percentB: number;
    bandwidth: number;
  } | null;
  readonly atr: number | null;
  readonly keltner: { upper: number; middle: number; lower: number } | null;
  readonly squeeze: { active: boolean; momentum: number } | null;
};

export type TechnicalVolume = {
  readonly vwap: number | null;
  readonly obv: number | null;
  readonly relativeVolume: number | null;
  readonly volumeProfile: readonly { price: number; volume: number }[];
};

export type TechnicalLevels = {
  readonly fibonacci: readonly { level: string; price: number }[];
  readonly pivots: {
    classic: Record<string, number>;
    camarilla: Record<string, number>;
    woodie: Record<string, number>;
  } | null;
  readonly support: readonly number[];
  readonly resistance: readonly number[];
};

export type TechnicalSnapshot = {
  readonly trend: TechnicalTrend;
  readonly momentum: TechnicalMomentum;
  readonly volatility: TechnicalVolatility;
  readonly volume: TechnicalVolume;
  readonly levels: TechnicalLevels;
};

export type CandlestickPattern = {
  readonly name: string;
  readonly type: PatternDirection;
  readonly confidence: number;
};

export type PricePattern = {
  readonly name: string;
  readonly type: PatternDirection;
  readonly confidence: number;
  readonly targetPrice?: number;
};

export type DivergencePattern = {
  readonly indicator: string;
  readonly type: PatternDirection;
  readonly confidence: number;
};

export type SpecialSignal = {
  readonly name: string;
  readonly description: string;
  readonly strength: number;
};

export type PatternSnapshot = {
  readonly candlesticks: readonly CandlestickPattern[];
  readonly price: readonly PricePattern[];
  readonly divergences: readonly DivergencePattern[];
  readonly signals: readonly SpecialSignal[];
};

export type FullMarketAnalysis = {
  readonly ticker: string;
  readonly bars: readonly OhlcvBar[];
  readonly news: NewsAggregate;
  readonly technicals: TechnicalSnapshot;
  readonly patterns: PatternSnapshot;
  readonly computedAt: string;
};

export type InstitutionalBadge =
  | "INSIDER BUY"
  | "SHORT SQUEEZE"
  | "OPTIONS FLOW"
  | "CATALYST"
  | "MACRO CAUTION";

export type EnhancedOpportunity = {
  readonly ticker: string;
  readonly score: number;
  readonly signals: readonly string[];
  readonly entry: number;
  readonly stopLoss: number;
  readonly takeProfit: number;
  readonly news: readonly NewsItem[];
  readonly side: "BUY" | "SELL" | "HOLD";
  readonly badges?: readonly InstitutionalBadge[];
  readonly macroCaution24h?: boolean;
  /** e.g. "Confluencia 3/4 TF" */
  readonly confluenceLabel?: string;
  readonly confluenceRatio?: string;
  readonly primaryTimeframe?: "5m" | "1h" | "1d" | "1wk";
  readonly higherTfConfirmation?: boolean;
  readonly mtfHighConfidence?: boolean;
  readonly mtfWeakSignal?: boolean;
};
