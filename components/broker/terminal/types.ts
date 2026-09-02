/** IBKR terminal contracts — read-only ANALYSIS_ONLY surface. */

export type BrokerHealth = {
  ok: boolean;
  liveTradingEnabled: boolean;
  ibkrReadOnly: boolean;
  emergencyStop: boolean;
};

export type BrokerStatus = {
  connected: boolean;
  nextOrderIdReady: boolean;
  nextValidId?: number | null;
  managedAccounts: string[];
  recentErrors?: Array<{ code: number; message: string }>;
  ibkrReadOnly?: boolean;
  liveTradingEnabled?: boolean;
  state?: string;
  error?: string;
};

export type AccountTag = { value: string; currency: string };
export type AccountMap = Record<string, Record<string, AccountTag>>;

/** Raw position from IBKR FastAPI — no invented market prices. */
export type IbkrPosition = {
  account: string;
  conId?: number;
  symbol: string;
  secType: string;
  exchange: string;
  currency: string;
  position: number;
  avgCost: number;
  /** Optional fields if service ever enriches — never invent client-side. */
  name?: string | null;
  marketPrice?: number | null;
  marketValue?: number | null;
  unrealizedPnl?: number | null;
  unrealizedPnlPct?: number | null;
  sector?: string | null;
  lastUpdate?: string | null;
};

export type IbkrOpenOrder = {
  orderId: number;
  permId?: number | null;
  account?: string | null;
  symbol: string;
  action: string;
  orderType: string;
  quantity: number;
  limitPrice: number | null;
  stopPrice?: number | null;
  tif?: string | null;
  outsideRth?: boolean | null;
  status: string;
  filled?: number | null;
  remaining?: number | null;
  avgFillPrice?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type DataSourceLabel = "IBKR_LIVE_READ_ONLY" | "DEMO" | "UNAVAILABLE";
export type MarketDataLabel = "LIVE" | "DELAYED" | "UNAVAILABLE";
export type ApiModeLabel = "READ_ONLY" | "TRADING";
export type SectionState = "READY" | "LOADING" | "DEGRADED" | "UNAVAILABLE" | "ERROR";

export type BrokerTerminalSnapshot = {
  health: BrokerHealth | null;
  status: BrokerStatus | null;
  account: AccountMap | null;
  positions: IbkrPosition[];
  orders: IbkrOpenOrder[];
  lastSyncAt: string | null;
  latencyMs: number | null;
  dataSource: DataSourceLabel;
  marketData: MarketDataLabel;
  sectionStates: {
    header: SectionState;
    summary: SectionState;
    positions: SectionState;
    orders: SectionState;
  };
  errors: {
    health?: string;
    status?: string;
    account?: string;
    positions?: string;
    orders?: string;
  };
  degraded: boolean;
};

export type Recommendation = "BUY" | "HOLD" | "REDUCE" | "EXIT" | "NO_DATA";
