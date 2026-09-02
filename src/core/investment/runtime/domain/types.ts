import type { MarketRuntimeEventEnvelope } from "./events";

export type SessionPhase = "closed" | "premarket" | "regular" | "after-hours" | "overnight";

export interface InstrumentDefinition {
  readonly id: string;
  readonly symbol: string;
  readonly market: string;
  readonly timezone: string;
}

export interface MarketSessionDescriptor {
  readonly market: string;
  readonly timezone: string;
  readonly holidaysUtc: readonly string[];
  readonly premarketOpenLocal: string;
  readonly regularOpenLocal: string;
  readonly regularCloseLocal: string;
  readonly afterHoursCloseLocal: string;
}

export interface MarketTick {
  readonly instrumentId: string;
  readonly bid?: number;
  readonly ask?: number;
  readonly last: number;
  readonly volume?: number;
  readonly barClosed?: boolean;
  readonly delayed?: boolean;
  readonly frozen?: boolean;
  readonly incomplete?: boolean;
  readonly spreadBps?: number;
  readonly capturedAtUtc: string;
}

export interface RuntimeHealthSnapshot {
  readonly streamConnected: boolean;
  readonly brokerConnected: boolean;
  readonly heartbeatLagMs: number;
  readonly lastHeartbeatUtc: string | null;
  readonly clockOffsetMs: number;
  readonly staleInstruments: readonly string[];
  readonly staleRuntime: boolean;
}

export interface RuntimeCheckpoint {
  readonly createdAtUtc: string;
  readonly watchlist: readonly InstrumentDefinition[];
  readonly staleInstruments: readonly string[];
  readonly lastTickByInstrument: Readonly<Record<string, MarketTick>>;
  readonly sessionPhaseByInstrument: Readonly<Record<string, SessionPhase>>;
  readonly clockOffsetMs: number;
  readonly brokerConnected: boolean;
}

export interface RuntimeStateStore {
  read(key: string): Promise<RuntimeCheckpoint | null>;
  write(key: string, checkpoint: RuntimeCheckpoint): Promise<void>;
}

export interface MarketDataPort {
  pullTicks(instruments: readonly InstrumentDefinition[]): Promise<readonly MarketTick[]>;
}

export interface RuntimeConfig {
  readonly heartbeatIntervalMs: number;
  readonly staleAfterMs: number;
  readonly reconnectBaseDelayMs: number;
  readonly reconnectMaxDelayMs: number;
  readonly checkpointKey: string;
  readonly checkpointEveryEvents: number;
  readonly maxHeartbeatMisses: number;
}

export const DEFAULT_RUNTIME_CONFIG: RuntimeConfig = {
  heartbeatIntervalMs: 10_000,
  staleAfterMs: 20_000,
  reconnectBaseDelayMs: 500,
  reconnectMaxDelayMs: 15_000,
  checkpointKey: "investment.liveMarketRuntime.v1",
  checkpointEveryEvents: 10,
  maxHeartbeatMisses: 3,
};

export type PublishEvent = <TPayload extends Record<string, unknown>>(
  event: MarketRuntimeEventEnvelope<TPayload>,
) => void;
