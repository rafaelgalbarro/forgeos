import type { MarketTickPayload } from "./types";

export class StaleDataGuard {
  private readonly stale = new Set<string>();
  private readonly lastTickAt = new Map<string, number>();

  constructor(private readonly staleAfterMs: number) {}

  inspect(tick: MarketTickPayload, nowUtc: string): boolean {
    const now = Date.parse(nowUtc);
    const captured = Date.parse(tick.capturedAtUtc);
    const delayed = tick.delayed === true || tick.frozen === true || tick.incomplete === true;
    const lagged = now - captured > this.staleAfterMs;
    const staleNow = delayed || lagged;
    this.lastTickAt.set(tick.instrumentId, captured);
    if (staleNow) this.stale.add(tick.instrumentId);
    else this.stale.delete(tick.instrumentId);
    return staleNow;
  }

  markStale(instrumentId: string): void {
    this.stale.add(instrumentId);
  }

  isStale(instrumentId: string): boolean {
    return this.stale.has(instrumentId);
  }

  staleInstruments(): readonly string[] {
    return [...this.stale.values()];
  }

  recover(staleInstruments: readonly string[]): void {
    this.stale.clear();
    for (const instrumentId of staleInstruments) this.stale.add(instrumentId);
  }
}
