/**
 * Normalized Live Market Runtime events.
 * Event-driven surface only — never an order path.
 */
export const MARKET_RUNTIME_EVENT_TYPES = [
  "MARKET_OPEN",
  "MARKET_CLOSE",
  "MARKET_TICK",
  "BAR_CLOSE",
  "POSITION_CHANGED",
  "ACCOUNT_CHANGED",
  "NEWS_RECEIVED",
  "MACRO_EVENT",
  "VOLATILITY_SPIKE",
  "LIQUIDITY_CHANGE",
  "SIGNAL_CREATED",
  "SIGNAL_EXPIRED",
  "RISK_UPDATED",
  "BROKER_CONNECTED",
  "BROKER_DISCONNECTED",
] as const;

export type MarketRuntimeEventType = (typeof MARKET_RUNTIME_EVENT_TYPES)[number];

export interface MarketRuntimeEventEnvelope<TPayload extends Record<string, unknown> = Record<string, unknown>> {
  readonly id: string;
  readonly type: MarketRuntimeEventType;
  readonly source: string;
  readonly occurredAtUtc: string;
  readonly market: string;
  readonly timezone: string;
  readonly instrumentId?: string;
  readonly payload: TPayload;
}

export type MarketRuntimeEventHandler<TPayload extends Record<string, unknown> = Record<string, unknown>> = (
  event: MarketRuntimeEventEnvelope<TPayload>,
) => void;
