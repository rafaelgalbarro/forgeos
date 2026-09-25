import type { RuntimeHealthSnapshot } from "../domain";

export class RuntimeHealth {
  private streamConnected = false;
  private brokerConnected = false;
  private lastHeartbeatUtc: string | null = null;
  private clockOffsetMs = 0;
  private readonly staleInstruments = new Set<string>();

  markStreamConnection(state: boolean): void {
    this.streamConnected = state;
  }

  markBrokerConnection(state: boolean): void {
    this.brokerConnected = state;
  }

  heartbeat(atUtc: string): void {
    this.lastHeartbeatUtc = atUtc;
  }

  setClockOffset(offsetMs: number): void {
    this.clockOffsetMs = offsetMs;
  }

  markStale(instrumentId: string, stale: boolean): void {
    if (stale) this.staleInstruments.add(instrumentId);
    else this.staleInstruments.delete(instrumentId);
  }

  snapshot(nowUtc: string): RuntimeHealthSnapshot {
    const lag = this.lastHeartbeatUtc
      ? Math.max(0, Date.parse(nowUtc) - Date.parse(this.lastHeartbeatUtc))
      : Infinity;
    return {
      streamConnected: this.streamConnected,
      brokerConnected: this.brokerConnected,
      heartbeatLagMs: Number.isFinite(lag) ? lag : Number.MAX_SAFE_INTEGER,
      lastHeartbeatUtc: this.lastHeartbeatUtc,
      clockOffsetMs: this.clockOffsetMs,
      staleInstruments: [...this.staleInstruments.values()],
      staleRuntime: this.staleInstruments.size > 0 || !this.streamConnected || !this.brokerConnected,
    };
  }
}
