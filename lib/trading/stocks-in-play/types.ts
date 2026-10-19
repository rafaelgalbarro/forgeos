export type StocksInPlayMode = "shadow" | "live";

export type StocksInPlayEntry = {
  symbol: string;
  reason: string;
  rankScore: number;
  metrics: {
    price: number;
    changePct: number;
    rvol: number;
    relStrengthSpy: number;
    spreadPct?: number;
    marketCap?: number;
    avgVolume: number;
    dollarVol20d?: number;
  };
};

export type StocksInPlayDayList = {
  dayKey: string;
  generatedAt: string;
  screened: number;
  afterHardFilters: number;
  symbols: StocksInPlayEntry[];
};

export type StocksInPlayShadowSignal = {
  at: string;
  symbol: string;
  entry: number;
  stopLoss?: number;
  takeProfit?: number;
  strategy?: string;
  closedAt?: string;
  exit?: number;
  netPnlUsd?: number;
  exitReason?: string;
};

export type StocksInPlayBacktestReport = {
  generatedAt: string;
  days: number;
  trades: number;
  meanNetPct: number;
  profitFactor: number;
  liveEligible: boolean;
  ineligibleReason?: string;
};
