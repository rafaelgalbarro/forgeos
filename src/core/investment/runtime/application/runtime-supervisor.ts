import type {
  InstrumentDefinition,
  MarketDataPort,
  MarketRuntimeEventEnvelope,
  MarketSessionDescriptor,
  MarketTick,
  RuntimeCheckpoint,
  RuntimeConfig,
  RuntimeStateStore,
} from "../domain";
import { DEFAULT_RUNTIME_CONFIG } from "../domain";
import { BrokerSessionManager } from "./broker-session-manager";
import { DataFreshnessMonitor } from "./data-freshness-monitor";
import { HeartbeatService } from "./heartbeat-service";
import { InstrumentRegistry } from "./instrument-registry";
import { MarketCalendar } from "./market-calendar";
import { MarketEventBus } from "./market-event-bus";
import { ReconnectManager } from "./reconnect-manager";
import { RuntimeClock } from "./runtime-clock";
import { RuntimeHealth } from "./runtime-health";

function buildEvent<TPayload extends Record<string, unknown>>(input: {
  type: MarketRuntimeEventEnvelope<TPayload>["type"];
  source: string;
  payload: TPayload;
  market: string;
  timezone: string;
  instrumentId?: string;
  occurredAtUtc?: string;
}): MarketRuntimeEventEnvelope<TPayload> {
  return {
    id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    type: input.type,
    source: input.source,
    occurredAtUtc: input.occurredAtUtc ?? new Date().toISOString(),
    market: input.market,
    timezone: input.timezone,
    instrumentId: input.instrumentId,
    payload: input.payload,
  };
}

export interface RuntimeSupervisorDependencies {
  readonly marketData: MarketDataPort;
  readonly brokerSessions: BrokerSessionManager;
  readonly stateStore: RuntimeStateStore;
  readonly sessions: Record<string, MarketSessionDescriptor>;
  readonly config?: Partial<RuntimeConfig>;
  readonly eventBus?: MarketEventBus;
  readonly clock?: RuntimeClock;
}

/**
 * Operational heart of Investment OS Live Market Runtime.
 * Event-driven observation only — never sends orders, never mutates trading mode flags.
 */
export class RuntimeSupervisor {
  readonly eventBus: MarketEventBus;
  readonly instruments = new InstrumentRegistry();
  readonly health = new RuntimeHealth();
  readonly clock: RuntimeClock;
  readonly calendar = new MarketCalendar();

  private readonly config: RuntimeConfig;
  private readonly freshness: DataFreshnessMonitor;
  private readonly reconnect: ReconnectManager;
  private readonly heartbeat: HeartbeatService;
  private readonly lastTickByInstrument = new Map<string, MarketTick>();
  private readonly lastMidByInstrument = new Map<string, number>();
  private readonly lastSpreadByInstrument = new Map<string, number>();
  private readonly activeSignals = new Map<string, { createdAtUtc: string; expiresAtUtc: string }>();

  private running = false;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private eventsSinceCheckpoint = 0;
  private orderPathBlocked = true;

  constructor(private readonly deps: RuntimeSupervisorDependencies) {
    this.config = { ...DEFAULT_RUNTIME_CONFIG, ...(deps.config ?? {}) };
    this.eventBus = deps.eventBus ?? new MarketEventBus();
    this.clock = deps.clock ?? new RuntimeClock();
    this.freshness = new DataFreshnessMonitor(this.config.staleAfterMs);
    this.reconnect = new ReconnectManager(this.config.reconnectBaseDelayMs, this.config.reconnectMaxDelayMs);
    this.heartbeat = new HeartbeatService(
      this.config.heartbeatIntervalMs,
      this.config.maxHeartbeatMisses,
      () => this.clock.nowUtc(),
    );
    this.heartbeat.onBeat((atUtc) => {
      this.health.heartbeat(atUtc);
    });
  }

  async recover(): Promise<RuntimeCheckpoint | null> {
    const checkpoint = await this.deps.stateStore.read(this.config.checkpointKey);
    if (!checkpoint) return null;
    this.instruments.recover(checkpoint.watchlist);
    this.freshness.recover(checkpoint.staleInstruments);
    this.calendar.recover(checkpoint.sessionPhaseByInstrument);
    this.clock.recover(checkpoint.clockOffsetMs);
    this.health.setClockOffset(checkpoint.clockOffsetMs);
    this.deps.brokerSessions.recover(checkpoint.brokerConnected);
    this.health.markBrokerConnection(checkpoint.brokerConnected);
    for (const [instrumentId, tick] of Object.entries(checkpoint.lastTickByInstrument)) {
      this.lastTickByInstrument.set(instrumentId, tick);
      this.health.markStale(instrumentId, checkpoint.staleInstruments.includes(instrumentId));
    }
    return checkpoint;
  }

  async start(): Promise<void> {
    this.enforceObservationOnlyGuards();
    this.running = true;
    this.orderPathBlocked = true;
    await this.deps.brokerSessions.connect();
    this.health.markBrokerConnection(true);
    this.health.markStreamConnection(true);
    this.publish("BROKER_CONNECTED", "runtime-supervisor", { connected: true }, "global", "UTC");
    this.reconnect.reset();
    this.heartbeat.start();
    await this.pollOnce();
  }

  async stop(): Promise<void> {
    this.running = false;
    this.heartbeat.stop();
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    await this.persistCheckpoint();
    await this.deps.brokerSessions.disconnect();
    this.health.markBrokerConnection(false);
    this.health.markStreamConnection(false);
  }

  addInstrument(instrument: InstrumentDefinition): void {
    this.instruments.upsert(instrument);
  }

  removeInstrument(instrumentId: string): void {
    this.instruments.remove(instrumentId);
  }

  isOrderPathBlocked(): boolean {
    return this.orderPathBlocked;
  }

  /**
   * Hard refusal — supervisors must never route to an order sender.
   */
  sendOrder(_request: unknown): never {
    this.orderPathBlocked = true;
    throw new Error("ORDER_PATH_BLOCKED: RuntimeSupervisor must not send orders.");
  }

  healthSnapshot(nowUtc = this.clock.nowUtc()) {
    return this.health.snapshot(nowUtc);
  }

  syncClock(referenceUtc: string): number {
    const offset = this.clock.sync(referenceUtc);
    this.health.setClockOffset(offset);
    return offset;
  }

  async pollOnce(): Promise<void> {
    if (!this.running) return;
    try {
      const ticks = await this.deps.marketData.pullTicks(this.instruments.list());
      this.health.markStreamConnection(true);
      this.deps.brokerSessions.markConnection(true);
      this.health.markBrokerConnection(true);
      this.reconnect.reset();
      this.heartbeat.beat(this.clock.nowUtc());

      if (ticks.length > 0) {
        this.syncClock(ticks[0]!.capturedAtUtc);
      }

      for (const tick of ticks) this.processTick(tick);
      this.expireSignals(this.clock.nowUtc());
      await this.maybeCheckpoint();
    } catch {
      this.health.markStreamConnection(false);
      this.deps.brokerSessions.markConnection(false);
      this.health.markBrokerConnection(false);
      this.emitBrokerDisconnected();
      this.scheduleReconnect();
    }
  }

  emitPositionChanged(payload: Record<string, unknown>, market = "global", timezone = "UTC"): void {
    this.publish("POSITION_CHANGED", "runtime-supervisor", payload, market, timezone);
  }

  emitAccountChanged(payload: Record<string, unknown>): void {
    this.publish("ACCOUNT_CHANGED", "runtime-supervisor", payload, "global", "UTC");
  }

  emitNewsReceived(payload: Record<string, unknown>, market = "global", timezone = "UTC"): void {
    this.publish("NEWS_RECEIVED", "runtime-supervisor", payload, market, timezone);
  }

  emitMacroEvent(payload: Record<string, unknown>): void {
    this.publish("MACRO_EVENT", "runtime-supervisor", payload, "global", "UTC");
  }

  emitRiskUpdated(payload: Record<string, unknown>): void {
    this.publish("RISK_UPDATED", "runtime-supervisor", payload, "global", "UTC");
  }

  private processTick(tick: MarketTick): void {
    const instrument = this.instruments.get(tick.instrumentId);
    if (!instrument) return;

    this.lastTickByInstrument.set(tick.instrumentId, tick);
    this.heartbeat.beat(this.clock.nowUtc());

    this.publish(
      "MARKET_TICK",
      "market-data",
      { ...tick },
      instrument.market,
      instrument.timezone,
      tick.instrumentId,
      tick.capturedAtUtc,
    );

    const stale = this.freshness.inspect(tick, this.clock.nowUtc());
    this.health.markStale(tick.instrumentId, stale);
    if (stale) this.orderPathBlocked = true;

    this.detectVolatility(tick, instrument);
    this.detectLiquidity(tick, instrument);

    if (tick.barClosed) {
      this.publish(
        "BAR_CLOSE",
        "market-data",
        { instrumentId: tick.instrumentId, capturedAtUtc: tick.capturedAtUtc },
        instrument.market,
        instrument.timezone,
        tick.instrumentId,
        tick.capturedAtUtc,
      );
    }

    this.updateSession(instrument, tick.capturedAtUtc);
  }

  private detectVolatility(tick: MarketTick, instrument: InstrumentDefinition): void {
    const mid =
      tick.bid !== undefined && tick.ask !== undefined ? (tick.bid + tick.ask) / 2 : tick.last;
    const previous = this.lastMidByInstrument.get(tick.instrumentId);
    this.lastMidByInstrument.set(tick.instrumentId, mid);
    if (previous === undefined) return;
    const change = Math.abs(mid - previous) / Math.max(previous, 0.0001);
    if (change <= 0.02) return;

    const signalId = `vol_${tick.instrumentId}_${Date.now().toString(36)}`;
    const createdAtUtc = this.clock.nowUtc();
    const expiresAtUtc = new Date(Date.parse(createdAtUtc) + 60_000).toISOString();
    this.activeSignals.set(signalId, { createdAtUtc, expiresAtUtc });

    this.publish(
      "VOLATILITY_SPIKE",
      "runtime-supervisor",
      { instrumentId: tick.instrumentId, last: tick.last, changePct: change },
      instrument.market,
      instrument.timezone,
      tick.instrumentId,
    );
    this.publish(
      "SIGNAL_CREATED",
      "runtime-supervisor",
      { signalId, kind: "VOLATILITY_SPIKE", instrumentId: tick.instrumentId, expiresAtUtc },
      instrument.market,
      instrument.timezone,
      tick.instrumentId,
    );
  }

  private detectLiquidity(tick: MarketTick, instrument: InstrumentDefinition): void {
    if (tick.bid === undefined || tick.ask === undefined) return;
    const spread = tick.ask - tick.bid;
    const previous = this.lastSpreadByInstrument.get(tick.instrumentId);
    this.lastSpreadByInstrument.set(tick.instrumentId, spread);
    if (previous === undefined) return;
    if (Math.abs(spread - previous) < Math.max(previous * 0.25, 0.01)) return;

    this.publish(
      "LIQUIDITY_CHANGE",
      "runtime-supervisor",
      { instrumentId: tick.instrumentId, spread, previousSpread: previous },
      instrument.market,
      instrument.timezone,
      tick.instrumentId,
    );
  }

  private updateSession(instrument: InstrumentDefinition, occurredAtUtc: string): void {
    const descriptor = this.deps.sessions[instrument.market];
    if (!descriptor) return;
    const session = this.calendar.update({
      instrumentId: instrument.id,
      occurredAtUtc,
      descriptor,
    });
    this.instruments.setOpenState(instrument.id, this.calendar.isMarketOpen(session.current));
    if (session.previous === session.current) return;

    const wasOpen = session.previous !== null && this.calendar.isMarketOpen(session.previous);
    const isOpen = this.calendar.isMarketOpen(session.current);

    if (!wasOpen && isOpen) {
      this.publish(
        "MARKET_OPEN",
        "market-calendar",
        { instrumentId: instrument.id, phase: session.current },
        instrument.market,
        instrument.timezone,
        instrument.id,
        occurredAtUtc,
      );
    } else if (wasOpen && !isOpen) {
      this.publish(
        "MARKET_CLOSE",
        "market-calendar",
        { instrumentId: instrument.id, phase: session.current },
        instrument.market,
        instrument.timezone,
        instrument.id,
        occurredAtUtc,
      );
    } else if (session.previous === null && session.current === "closed") {
      this.publish(
        "MARKET_CLOSE",
        "market-calendar",
        { instrumentId: instrument.id, phase: session.current },
        instrument.market,
        instrument.timezone,
        instrument.id,
        occurredAtUtc,
      );
    }
  }

  private expireSignals(nowUtc: string): void {
    const now = Date.parse(nowUtc);
    for (const [signalId, signal] of this.activeSignals.entries()) {
      if (Date.parse(signal.expiresAtUtc) > now) continue;
      this.activeSignals.delete(signalId);
      this.publish(
        "SIGNAL_EXPIRED",
        "runtime-supervisor",
        { signalId, expiredAtUtc: nowUtc },
        "global",
        "UTC",
      );
    }
  }

  private emitBrokerDisconnected(): void {
    this.eventBus.publish(
      buildEvent({
        type: "BROKER_DISCONNECTED",
        source: "runtime-supervisor",
        market: "global",
        timezone: "UTC",
        payload: { connected: false },
      }),
    );
    this.eventsSinceCheckpoint += 1;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    const delay = this.reconnect.nextDelayMs();
    this.reconnectTimer = setTimeout(async () => {
      if (!this.running) return;
      try {
        await this.deps.brokerSessions.connect();
        this.health.markBrokerConnection(true);
        this.health.markStreamConnection(true);
        this.eventBus.publish(
          buildEvent({
            type: "BROKER_CONNECTED",
            source: "runtime-supervisor",
            market: "global",
            timezone: "UTC",
            payload: { connected: true, delayMs: delay, attempt: this.reconnect.attemptCount() },
          }),
        );
        this.eventsSinceCheckpoint += 1;
        await this.pollOnce();
      } catch {
        this.scheduleReconnect();
      }
    }, delay);
  }

  private publish(
    type: MarketRuntimeEventEnvelope["type"],
    source: string,
    payload: Record<string, unknown>,
    market: string,
    timezone: string,
    instrumentId?: string,
    occurredAtUtc?: string,
  ): void {
    this.eventBus.publish(
      buildEvent({
        type,
        source,
        payload,
        market,
        timezone,
        instrumentId,
        occurredAtUtc,
      }),
    );
    this.eventsSinceCheckpoint += 1;
  }

  private async maybeCheckpoint(): Promise<void> {
    if (this.eventsSinceCheckpoint < this.config.checkpointEveryEvents) return;
    await this.persistCheckpoint();
  }

  private async persistCheckpoint(): Promise<void> {
    this.eventsSinceCheckpoint = 0;
    await this.deps.stateStore.write(this.config.checkpointKey, {
      createdAtUtc: this.clock.nowUtc(),
      watchlist: this.instruments.list(),
      staleInstruments: this.freshness.staleInstruments(),
      lastTickByInstrument: Object.fromEntries(this.lastTickByInstrument.entries()),
      sessionPhaseByInstrument: this.calendar.snapshot(),
      clockOffsetMs: this.clock.offset(),
      brokerConnected: this.deps.brokerSessions.isConnected(),
    });
  }

  /**
   * Observation-only: do not mutate ANALYSIS_ONLY / LIVE_TRADING_ENABLED / IBKR_READ_ONLY.
   * Refuse to start if live trading flags are incorrectly enabled.
   */
  private enforceObservationOnlyGuards(): void {
    if (process.env.LIVE_TRADING_ENABLED === "true") {
      throw new Error("Live Market Runtime refuses start while LIVE_TRADING_ENABLED=true.");
    }
    if (process.env.IBKR_READ_ONLY === "false") {
      throw new Error("Live Market Runtime refuses start while IBKR_READ_ONLY=false.");
    }
  }
}
