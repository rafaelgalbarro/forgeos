import { LiveEventBus } from "./event-bus";
import { InstrumentRegistry } from "./instrument-registry";
import { MarketStream } from "./market-stream";
import { OpportunityScanner } from "./opportunity-scanner";
import { ReconnectManager } from "./reconnect-manager";
import { RuntimeHealth } from "./runtime-health";
import { SessionCalendar } from "./session-calendar";
import { SignalEngine } from "./signal-engine";
import { StaleDataGuard } from "./stale-data-guard";
import { assertShadowEnvironment } from "../shadow/guardrails";
import type {
  EventEnvelope,
  InstrumentDefinition,
  LiveRuntimeDependencies,
  MarketTickPayload,
  RuntimeConfig,
} from "./types";

const DEFAULT_CONFIG: RuntimeConfig = {
  heartbeatIntervalMs: 10_000,
  staleAfterMs: 20_000,
  reconnectBaseDelayMs: 500,
  reconnectMaxDelayMs: 15_000,
  checkpointKey: "investment.liveRuntime.v1",
  checkpointEveryEvents: 10,
};

function buildEvent<TPayload extends Record<string, unknown>>(input: {
  type: EventEnvelope<TPayload>["type"];
  source: string;
  payload: TPayload;
  market: string;
  timezone: string;
  instrumentId?: string;
}): EventEnvelope<TPayload> {
  return {
    id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    type: input.type,
    source: input.source,
    occurredAtUtc: new Date().toISOString(),
    market: input.market,
    timezone: input.timezone,
    instrumentId: input.instrumentId,
    payload: input.payload,
  };
}

export class LiveMarketRuntimeOrchestrator {
  readonly eventBus = new LiveEventBus();
  readonly instruments = new InstrumentRegistry();
  readonly health = new RuntimeHealth();
  readonly signalEngine = new SignalEngine();

  private readonly config: RuntimeConfig;
  private readonly stream: MarketStream;
  private readonly staleGuard: StaleDataGuard;
  private readonly reconnect: ReconnectManager;
  private readonly calendar = new SessionCalendar();
  private readonly scanner = new OpportunityScanner();
  private readonly lastTickByInstrument = new Map<string, MarketTickPayload>();
  private running = false;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private eventsSinceCheckpoint = 0;

  constructor(private readonly deps: LiveRuntimeDependencies) {
    this.config = { ...DEFAULT_CONFIG, ...(deps.config ?? {}) };
    this.stream = new MarketStream(deps.brokerEngine);
    this.staleGuard = new StaleDataGuard(this.config.staleAfterMs);
    this.reconnect = new ReconnectManager(
      this.config.reconnectBaseDelayMs,
      this.config.reconnectMaxDelayMs,
    );
  }

  async recover(): Promise<void> {
    const checkpoint = await this.deps.stateStore.read(this.config.checkpointKey);
    if (!checkpoint) return;
    for (const instrument of checkpoint.watchlist) this.instruments.upsert(instrument);
    this.staleGuard.recover(checkpoint.staleInstruments);
    this.calendar.recover(checkpoint.sessionPhaseByInstrument);
    for (const [instrumentId, tick] of Object.entries(checkpoint.lastTickByInstrument)) {
      this.lastTickByInstrument.set(instrumentId, tick);
    }
  }

  async start(): Promise<void> {
    this.enforceSafetyFlags();
    this.running = true;
    this.health.markConnection(true);
    this.reconnect.reset();
    this.startHeartbeat();
    await this.pollOnce();
  }

  stop(): void {
    this.running = false;
    this.health.markConnection(false);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.heartbeatTimer = null;
    this.reconnectTimer = null;
  }

  addInstrument(instrument: InstrumentDefinition): void {
    this.instruments.upsert(instrument);
  }

  removeInstrument(instrumentId: string): void {
    this.instruments.remove(instrumentId);
  }

  isOrderPathBlocked(): boolean {
    return this.signalEngine.isOrderPathBlocked();
  }

  healthSnapshot(nowUtc = new Date().toISOString()) {
    return this.health.snapshot(nowUtc);
  }

  async pollOnce(): Promise<void> {
    if (!this.running) return;
    try {
      const batch = await this.stream.pull(this.instruments.list());
      this.health.markConnection(true);
      this.reconnect.reset();
      for (const tick of batch.ticks) this.processTick(tick);
      await this.maybeCheckpoint();
    } catch {
      this.health.markConnection(false);
      this.emitConnectionLost();
      const delay = this.reconnect.nextDelayMs();
      this.reconnectTimer = setTimeout(async () => {
        if (!this.running) return;
        this.eventBus.publish(
          buildEvent({
            type: "CONNECTION_RESTORED",
            source: "live-runtime",
            market: "global",
            timezone: "UTC",
            payload: { delayMs: delay },
          }),
        );
        await this.pollOnce();
      }, delay);
    }
  }

  private processTick(tick: MarketTickPayload): void {
    const instrument = this.instruments.get(tick.instrumentId);
    if (!instrument) return;

    this.lastTickByInstrument.set(tick.instrumentId, tick);
    this.health.heartbeat(new Date().toISOString());

    this.eventBus.publish(
      buildEvent({
        type: "MARKET_TICK",
        source: "market-stream",
        market: instrument.market,
        timezone: instrument.timezone,
        instrumentId: tick.instrumentId,
        payload: { ...tick },
      }),
    );
    this.eventsSinceCheckpoint += 1;

    const stale = this.staleGuard.inspect(tick, new Date().toISOString());
    this.health.markStale(tick.instrumentId, stale);
    if (stale) {
      this.eventBus.publish(
        buildEvent({
          type: "DATA_STALE",
          source: "stale-data-guard",
          market: instrument.market,
          timezone: instrument.timezone,
          instrumentId: tick.instrumentId,
          payload: { instrumentId: tick.instrumentId, capturedAtUtc: tick.capturedAtUtc },
        }),
      );
      this.eventsSinceCheckpoint += 1;
    }

    const signal = this.signalEngine.evaluateTick(tick, stale);
    if (signal.volumeSpike) {
      this.eventBus.publish(
        buildEvent({
          type: "VOLUME_SPIKE",
          source: "signal-engine",
          market: instrument.market,
          timezone: instrument.timezone,
          instrumentId: tick.instrumentId,
          payload: { instrumentId: tick.instrumentId, volume: tick.volume ?? 0 },
        }),
      );
      this.eventsSinceCheckpoint += 1;
    }
    if (signal.volatilityChanged) {
      this.eventBus.publish(
        buildEvent({
          type: "VOLATILITY_CHANGED",
          source: "signal-engine",
          market: instrument.market,
          timezone: instrument.timezone,
          instrumentId: tick.instrumentId,
          payload: { instrumentId: tick.instrumentId, last: tick.last },
        }),
      );
      this.eventsSinceCheckpoint += 1;
    }

    const spread = this.scanner.inspect(tick);
    if (spread.spreadChanged) {
      this.eventBus.publish(
        buildEvent({
          type: "SPREAD_CHANGED",
          source: "opportunity-scanner",
          market: instrument.market,
          timezone: instrument.timezone,
          instrumentId: tick.instrumentId,
          payload: { instrumentId: tick.instrumentId, spread: spread.spread ?? 0 },
        }),
      );
      this.eventsSinceCheckpoint += 1;
    }

    if (tick.barClosed) {
      this.eventBus.publish(
        buildEvent({
          type: "BAR_CLOSED",
          source: "market-stream",
          market: instrument.market,
          timezone: instrument.timezone,
          instrumentId: tick.instrumentId,
          payload: { instrumentId: tick.instrumentId, capturedAtUtc: tick.capturedAtUtc },
        }),
      );
      this.eventsSinceCheckpoint += 1;
    }

    const descriptor = this.deps.sessions[instrument.market];
    if (!descriptor) return;
    const session = this.calendar.update({
      instrumentId: instrument.id,
      occurredAtUtc: tick.capturedAtUtc,
      descriptor,
    });
    this.instruments.setOpenState(instrument.id, session.current !== "closed" && session.current !== "overnight");
    if (session.previous !== session.current) {
      const type = session.current === "regular" ? "SESSION_OPENED" : "SESSION_CLOSED";
      this.eventBus.publish(
        buildEvent({
          type,
          source: "session-calendar",
          market: instrument.market,
          timezone: instrument.timezone,
          instrumentId: instrument.id,
          payload: { instrumentId: instrument.id, phase: session.current },
        }),
      );
      this.eventsSinceCheckpoint += 1;
    }
  }

  private emitConnectionLost(): void {
    this.eventBus.publish(
      buildEvent({
        type: "CONNECTION_LOST",
        source: "market-stream",
        market: "global",
        timezone: "UTC",
        payload: {},
      }),
    );
    this.eventsSinceCheckpoint += 1;
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (!this.running) return;
      this.health.heartbeat(new Date().toISOString());
    }, this.config.heartbeatIntervalMs);
  }

  private async maybeCheckpoint(): Promise<void> {
    if (this.eventsSinceCheckpoint < this.config.checkpointEveryEvents) return;
    this.eventsSinceCheckpoint = 0;
    await this.deps.stateStore.write(this.config.checkpointKey, {
      createdAtUtc: new Date().toISOString(),
      watchlist: this.instruments.list(),
      staleInstruments: this.staleGuard.staleInstruments(),
      lastTickByInstrument: Object.fromEntries(this.lastTickByInstrument.entries()),
      sessionPhaseByInstrument: this.calendar.snapshot(),
    });
  }

  private enforceSafetyFlags(): void {
    if (process.env.LIVE_TRADING_ENABLED !== "false") {
      throw new Error("LIVE_TRADING_ENABLED must stay false.");
    }
    if (process.env.IBKR_READ_ONLY !== "true") {
      throw new Error("IBKR_READ_ONLY must stay true.");
    }
    if (process.env.SHADOW_MODE === "true") {
      assertShadowEnvironment(process.env);
    }
  }
}
