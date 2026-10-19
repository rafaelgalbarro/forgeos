export type StocksRunnerEntry = {
  symbol: string;
  reason: string;
  metrics: { price: number; changePct: number; rvol: number; spreadPct?: number };
};

export type StocksRunnersDayList = {
  dayKey: string;
  generatedAt: string;
  screened: number;
  symbols: StocksRunnerEntry[];
};

export type StocksRunnerShadowSignal = {
  at: string;
  symbol: string;
  entry: number;
  stopLoss?: number;
  takeProfit?: number;
  strategy?: string;
  spreadPct?: number;
  commissionUsd?: number;
  closedAt?: string;
  exit?: number;
  netPnlUsd?: number;
  exitReason?: string;
};
