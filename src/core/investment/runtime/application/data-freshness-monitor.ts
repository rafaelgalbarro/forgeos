import type { MarketTick } from "../domain";

export class DataFreshnessMonitor {
  private readonly stale = new Set<string>();
  private readonly lastTickAt = new Map<string, number>();

  constructor(private readonly staleAfterMs: number) {}

  inspect(tick: MarketTick, nowUtc: string): boolean {
    const now = Date.parse(nowUtc);
    const captured = Date.parse(tick.capturedAtUtc);
    const delayed = tick.delayed === true || tick.frozen === true || tick.incomplete === true;
    const lagged = Number.isFinite(captured) && now - captured > this.staleAfterMs;
    const staleNow = delayed || lagged;
    this.lastTickAt.set(tick.instrumentId, captured);
    if (staleNow) this.stale.add(tick.instrumentId);
    else this.stale.delete(tick.instrumentId);
    return staleNow;
  }

  inspectAge(instrumentId: string, capturedAtUtc: string, nowUtc: string): boolean {
    const now = Date.parse(nowUtc);
    const captured = Date.parse(capturedAtUtc);
    const lagged = Number.isFinite(captured) && now - captured > this.staleAfterMs;
    if (lagged) this.stale.add(instrumentId);
    else this.stale.delete(instrumentId);
    return lagged;
  }

  isStale(instrumentId: string): boolean {
    return this.stale.has(instrumentId);
  }

  staleInstruments(): readonly string[] {
    return [...this.stale.values()];
  }

  lastSeenMs(instrumentId: string): number | undefined {
    return this.lastTickAt.get(instrumentId);
  }

  recover(staleInstruments: readonly string[]): void {
    this.stale.clear();
    for (const instrumentId of staleInstruments) this.stale.add(instrumentId);
  }
}
