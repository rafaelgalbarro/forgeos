import type { BrokerEngine } from "@/src/core/application/ports/broker-engine";

export type RuntimeEventType =
  | "MARKET_TICK"
  | "BAR_CLOSED"
  | "SPREAD_CHANGED"
  | "VOLUME_SPIKE"
  | "VOLATILITY_CHANGED"
  | "SESSION_OPENED"
  | "SESSION_CLOSED"
  | "DATA_STALE"
  | "CONNECTION_LOST"
  | "CONNECTION_RESTORED";

export type SessionPhase =
  | "closed"
  | "premarket"
  | "regular"
  | "after-hours"
  | "overnight";

export interface EventEnvelope<TPayload extends Record<string, unknown>> {
  id: string;
  type: RuntimeEventType;
  source: string;
  occurredAtUtc: string;
  market: string;
  timezone: string;
  instrumentId?: string;
  payload: TPayload;
}

export interface InstrumentDefinition {
  id: string;
  symbol: string;
  market: string;
  timezone: string;
}

export interface SessionDescriptor {
  market: string;
  timezone: string;
  holidaysUtc: readonly string[];
  premarketOpenLocal: string;
  regularOpenLocal: string;
  regularCloseLocal: string;
  afterHoursCloseLocal: string;
}

export interface MarketTickPayload {
  instrumentId: string;
  bid?: number;
  ask?: number;
  last: number;
  volume?: number;
  barClosed?: boolean;
  delayed?: boolean;
  frozen?: boolean;
  incomplete?: boolean;
  capturedAtUtc: string;
}

export interface RuntimeHealthSnapshot {
  streamConnected: boolean;
  heartbeatLagMs: number;
  lastHeartbeatUtc: string | null;
  staleInstruments: readonly string[];
  staleRuntime: boolean;
}

export interface RuntimeCheckpoint {
  createdAtUtc: string;
  watchlist: readonly InstrumentDefinition[];
  staleInstruments: readonly string[];
  lastTickByInstrument: Record<string, MarketTickPayload>;
  sessionPhaseByInstrument: Record<string, SessionPhase>;
}

export interface RuntimeStateStore {
  read(key: string): Promise<RuntimeCheckpoint | null>;
  write(key: string, checkpoint: RuntimeCheckpoint): Promise<void>;
}

export interface RuntimeConfig {
  readonly heartbeatIntervalMs: number;
  readonly staleAfterMs: number;
  readonly reconnectBaseDelayMs: number;
  readonly reconnectMaxDelayMs: number;
  readonly checkpointKey: string;
  readonly checkpointEveryEvents: number;
}

export interface LiveRuntimeDependencies {
  brokerEngine: BrokerEngine;
  sessions: Record<string, SessionDescriptor>;
  stateStore: RuntimeStateStore;
  config?: Partial<RuntimeConfig>;
}
