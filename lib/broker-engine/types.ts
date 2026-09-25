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
};

export type AccountTag = { value: string; currency: string };
export type AccountMap = Record<string, Record<string, AccountTag>>;

export type Position = {
  account: string;
  symbol: string;
  secType: string;
  exchange: string;
  currency: string;
  position: number;
  avgCost: number;
};

export type OpenOrder = {
  orderId: number;
  symbol: string;
  action: string;
  orderType: string;
  quantity: number;
  limitPrice: number | null;
  status: string;
};

export type Proposal = {
  id: string;
  status: string;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  order_type: "LMT";
  limit_price: number;
  currency: string;
  exchange: string;
  rationale: string;
  risk_checks: Array<{ name: string; passed: boolean; detail: unknown }>;
};
