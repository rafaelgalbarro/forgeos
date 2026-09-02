import type { RuntimeHealthSnapshot } from "./types";

export class RuntimeHealth {
  private streamConnected = false;
  private lastHeartbeatUtc: string | null = null;
  private staleInstruments = new Set<string>();

  markConnection(state: boolean): void {
    this.streamConnected = state;
  }

  heartbeat(atUtc: string): void {
    this.lastHeartbeatUtc = atUtc;
  }

  markStale(instrumentId: string, stale: boolean): void {
    if (stale) this.staleInstruments.add(instrumentId);
    else this.staleInstruments.delete(instrumentId);
  }

  snapshot(nowUtc: string): RuntimeHealthSnapshot {
    const lag = this.lastHeartbeatUtc ? Math.max(0, Date.parse(nowUtc) - Date.parse(this.lastHeartbeatUtc)) : Infinity;
    return {
      streamConnected: this.streamConnected,
      heartbeatLagMs: Number.isFinite(lag) ? lag : Number.MAX_SAFE_INTEGER,
      lastHeartbeatUtc: this.lastHeartbeatUtc,
      staleInstruments: [...this.staleInstruments.values()],
      staleRuntime: this.staleInstruments.size > 0,
    };
  }
}
