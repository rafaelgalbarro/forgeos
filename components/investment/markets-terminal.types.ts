/**
 * Markets Analysis Terminal — client types.
 * Quotes/bars come only from MI screener gather; never invent prices.
 */

export type AssetClassId =
  | "stocks"
  | "etf"
  | "forex"
  | "indices"
  | "futures"
  | "options"
  | "bonds"
  | "commodities"
  | "crypto";

export type CatalogInstrument = {
  readonly symbol: string;
  readonly name: string;
  readonly assetClass: AssetClassId;
  readonly market: string;
  readonly sector?: string;
  readonly country?: string;
  readonly currency?: string;
};

export type IndicatorId =
  | "ema"
  | "sma"
  | "vwap"
  | "rsi"
  | "macd"
  | "adx"
  | "atr"
  | "bollinger"
  | "ichimoku"
  | "supertrend"
  | "donchian"
  | "fibonacci"
  | "pivot"
  | "marketStructure"
  | "orderBlocks"
  | "fvg"
  | "liquidity";

export type IndicatorToggle = {
  readonly id: IndicatorId;
  readonly label: string;
  /** Minimum OHLC bars required to compute from real series. */
  readonly minBars: number;
  /** Requires volume series when true. */
  readonly needsVolume?: boolean;
};

export type OhlcBar = {
  readonly timestamp: string;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume?: number;
};

export type MetricValue =
  | { readonly state: "READY"; readonly value: string; readonly raw?: number }
  | { readonly state: "NO_DATA" | "UNAVAILABLE" | "ANALYSIS_ONLY"; readonly value: string };

export type ScreenerGatherClientPayload = {
  readonly generatedAt?: string;
  readonly mode?: string;
  readonly empty?: boolean;
  readonly note?: string;
  readonly providersConfigured?: number;
  readonly symbols?: readonly string[];
  readonly result?: {
    readonly generatedAt?: string;
    readonly marketSnapshots?: readonly {
      readonly symbol: string;
      readonly quote?: {
        readonly symbol: string;
        readonly price: number;
        readonly currency: string;
        readonly timestamp: string;
        readonly providerId: string;
      };
      readonly timeSeries?: {
        readonly symbol: string;
        readonly interval: string;
        readonly points: readonly OhlcBar[];
        readonly providerId: string;
      };
      readonly assetClass?: string;
      readonly capturedAt: string;
      readonly providerId: string;
    }[];
    readonly economicIndicators?: readonly {
      readonly key: string;
      readonly label: string;
      readonly value: number;
      readonly unit?: string;
      readonly period: string;
      readonly providerId: string;
    }[];
    readonly news?: readonly {
      readonly id: string;
      readonly title: string;
      readonly summary?: string;
      readonly url: string;
      readonly publishedAt: string;
      readonly source: string;
      readonly providerId: string;
      readonly symbols?: readonly string[];
    }[];
    readonly sentiment?: readonly {
      readonly signalId: string;
      readonly target: string;
      readonly score: number;
      readonly confidence: number;
      readonly rationale?: string;
      readonly providerId: string;
      readonly timestamp: string;
    }[];
    readonly providersUsed?: readonly string[];
    readonly errors?: readonly { readonly providerId: string; readonly message: string }[];
  } | null;
  readonly error?: string;
};

export type MiStatusClientPayload = {
  readonly totalConfigured?: number;
  readonly note?: string;
  readonly assetClassesSupported?: readonly string[];
  readonly marketProviders?: readonly { readonly id: string }[];
  readonly newsProviders?: readonly { readonly id: string }[];
  readonly economicProviders?: readonly { readonly id: string }[];
  readonly sentimentProviders?: readonly { readonly id: string }[];
  readonly tradeGate?: string;
  readonly mode?: string;
};

export type AuditClientPayload = {
  readonly items?: readonly {
    readonly id: string;
    readonly kind: string;
    readonly occurredAt: string;
    readonly symbol?: string | null;
    readonly summary: string;
  }[];
  readonly count?: number;
  readonly note?: string;
};

export const INDICATOR_TOGGLES: readonly IndicatorToggle[] = [
  { id: "ema", label: "EMA", minBars: 20 },
  { id: "sma", label: "SMA", minBars: 20 },
  { id: "vwap", label: "VWAP", minBars: 2, needsVolume: true },
  { id: "rsi", label: "RSI", minBars: 15 },
  { id: "macd", label: "MACD", minBars: 35 },
  { id: "adx", label: "ADX", minBars: 28 },
  { id: "atr", label: "ATR", minBars: 15 },
  { id: "bollinger", label: "Bollinger", minBars: 20 },
  { id: "ichimoku", label: "Ichimoku", minBars: 52 },
  { id: "supertrend", label: "Supertrend", minBars: 15 },
  { id: "donchian", label: "Donchian", minBars: 20 },
  { id: "fibonacci", label: "Fibonacci", minBars: 5 },
  { id: "pivot", label: "Pivot Points", minBars: 2 },
  { id: "marketStructure", label: "Market Structure", minBars: 10 },
  { id: "orderBlocks", label: "Order Blocks", minBars: 20 },
  { id: "fvg", label: "Fair Value Gaps", minBars: 5 },
  { id: "liquidity", label: "Liquidity Zones", minBars: 20 },
] as const;

export const ASSET_CLASS_LABELS: Record<AssetClassId, string> = {
  stocks: "Acciones",
  etf: "ETFs",
  forex: "Forex",
  indices: "Índices",
  futures: "Futuros",
  options: "Opciones",
  bonds: "Bonos",
  commodities: "Materias primas",
  crypto: "Criptomonedas",
};

/** Symbol catalog for search/browse — metadata only, never prices. */
export const MARKETS_CATALOG: readonly CatalogInstrument[] = [
  { symbol: "AAPL", name: "Apple Inc.", assetClass: "stocks", market: "NASDAQ", sector: "Technology", country: "US", currency: "USD" },
  { symbol: "MSFT", name: "Microsoft Corp.", assetClass: "stocks", market: "NASDAQ", sector: "Technology", country: "US", currency: "USD" },
  { symbol: "GOOGL", name: "Alphabet Inc.", assetClass: "stocks", market: "NASDAQ", sector: "Technology", country: "US", currency: "USD" },
  { symbol: "AMZN", name: "Amazon.com Inc.", assetClass: "stocks", market: "NASDAQ", sector: "Consumer", country: "US", currency: "USD" },
  { symbol: "NVDA", name: "NVIDIA Corp.", assetClass: "stocks", market: "NASDAQ", sector: "Technology", country: "US", currency: "USD" },
  { symbol: "META", name: "Meta Platforms", assetClass: "stocks", market: "NASDAQ", sector: "Technology", country: "US", currency: "USD" },
  { symbol: "TSLA", name: "Tesla Inc.", assetClass: "stocks", market: "NASDAQ", sector: "Consumer", country: "US", currency: "USD" },
  { symbol: "JPM", name: "JPMorgan Chase", assetClass: "stocks", market: "NYSE", sector: "Financials", country: "US", currency: "USD" },
  { symbol: "V", name: "Visa Inc.", assetClass: "stocks", market: "NYSE", sector: "Financials", country: "US", currency: "USD" },
  { symbol: "JNJ", name: "Johnson & Johnson", assetClass: "stocks", market: "NYSE", sector: "Health Care", country: "US", currency: "USD" },
  { symbol: "SPY", name: "SPDR S&P 500 ETF", assetClass: "etf", market: "NYSE Arca", sector: "Broad Market", country: "US", currency: "USD" },
  { symbol: "QQQ", name: "Invesco QQQ Trust", assetClass: "etf", market: "NASDAQ", sector: "Technology", country: "US", currency: "USD" },
  { symbol: "IWM", name: "iShares Russell 2000", assetClass: "etf", market: "NYSE Arca", country: "US", currency: "USD" },
  { symbol: "DIA", name: "SPDR Dow Jones Industrial", assetClass: "etf", market: "NYSE Arca", country: "US", currency: "USD" },
  { symbol: "EFA", name: "iShares MSCI EAFE", assetClass: "etf", market: "NYSE Arca", country: "US", currency: "USD" },
  { symbol: "EEM", name: "iShares MSCI Emerging", assetClass: "etf", market: "NYSE Arca", country: "US", currency: "USD" },
  { symbol: "GLD", name: "SPDR Gold Shares", assetClass: "etf", market: "NYSE Arca", country: "US", currency: "USD" },
  { symbol: "TLT", name: "iShares 20+ Year Treasury", assetClass: "bonds", market: "NASDAQ", country: "US", currency: "USD" },
  { symbol: "IEF", name: "iShares 7-10 Year Treasury", assetClass: "bonds", market: "NASDAQ", country: "US", currency: "USD" },
  { symbol: "AGG", name: "iShares Core US Aggregate Bond", assetClass: "bonds", market: "NYSE Arca", country: "US", currency: "USD" },
  { symbol: "BND", name: "Vanguard Total Bond Market", assetClass: "bonds", market: "NASDAQ", country: "US", currency: "USD" },
  { symbol: "EURUSD", name: "Euro / US Dollar", assetClass: "forex", market: "FX", currency: "USD", country: "EU/US" },
  { symbol: "GBPUSD", name: "British Pound / US Dollar", assetClass: "forex", market: "FX", currency: "USD", country: "UK/US" },
  { symbol: "USDJPY", name: "US Dollar / Japanese Yen", assetClass: "forex", market: "FX", currency: "JPY", country: "US/JP" },
  { symbol: "AUDUSD", name: "Australian Dollar / US Dollar", assetClass: "forex", market: "FX", currency: "USD", country: "AU/US" },
  { symbol: "USDCAD", name: "US Dollar / Canadian Dollar", assetClass: "forex", market: "FX", currency: "CAD", country: "US/CA" },
  { symbol: "SPX", name: "S&P 500 Index", assetClass: "indices", market: "INDEX", country: "US" },
  { symbol: "NDX", name: "Nasdaq 100 Index", assetClass: "indices", market: "INDEX", country: "US" },
  { symbol: "DJI", name: "Dow Jones Industrial Average", assetClass: "indices", market: "INDEX", country: "US" },
  { symbol: "VIX", name: "CBOE Volatility Index", assetClass: "indices", market: "INDEX", country: "US" },
  { symbol: "ES", name: "E-mini S&P 500", assetClass: "futures", market: "CME", country: "US" },
  { symbol: "NQ", name: "E-mini Nasdaq-100", assetClass: "futures", market: "CME", country: "US" },
  { symbol: "CL", name: "Crude Oil Futures", assetClass: "futures", market: "NYMEX", country: "US" },
  { symbol: "GC", name: "Gold Futures", assetClass: "futures", market: "COMEX", country: "US" },
  { symbol: "SLV", name: "iShares Silver Trust", assetClass: "commodities", market: "NYSE Arca", country: "US", currency: "USD" },
  { symbol: "USO", name: "United States Oil Fund", assetClass: "commodities", market: "NYSE Arca", country: "US", currency: "USD" },
  { symbol: "UNG", name: "US Natural Gas Fund", assetClass: "commodities", market: "NYSE Arca", country: "US", currency: "USD" },
  { symbol: "BTC-USD", name: "Bitcoin / USD", assetClass: "crypto", market: "CRYPTO", country: "Global", currency: "USD" },
  { symbol: "ETH-USD", name: "Ethereum / USD", assetClass: "crypto", market: "CRYPTO", country: "Global", currency: "USD" },
  /** Options analysis uses underlying symbols; chain data UNAVAILABLE until a chain provider is wired. */
  { symbol: "SPY", name: "S&P 500 ETF (options underlying)", assetClass: "options", market: "OPRA", country: "US", currency: "USD" },
] as const;

export const LEFT_NAV_SECTIONS = [
  { id: "favorites", label: "Favorites" },
  { id: "watchlists", label: "Watchlists" },
  { id: "sectors", label: "Sectors" },
  { id: "countries", label: "Countries" },
  { id: "currencies", label: "Currencies" },
  { id: "indices", label: "Indices" },
  { id: "filters", label: "Filters" },
] as const;

export type LeftNavSectionId = (typeof LEFT_NAV_SECTIONS)[number]["id"];

export const POLL_MS = 15_000;
export const FAVORITES_KEY = "forgeos.investment.markets.favorites";
export const WATCHLIST_KEY = "forgeos.investment.markets.watchlist";
