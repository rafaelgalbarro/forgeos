import type { MarketTickPayload } from "./types";

export interface SignalGate {
  canEmitExecutableSignal: boolean;
  reason?: string;
}

export class SignalEngine {
  private readonly lastVolume = new Map<string, number>();
  private readonly lastVolatility = new Map<string, number>();
  private executableSignalBlocked = false;

  evaluateTick(tick: MarketTickPayload, stale: boolean): {
    volumeSpike: boolean;
    volatilityChanged: boolean;
    gate: SignalGate;
  } {
    if (stale) {
      this.executableSignalBlocked = true;
      return {
        volumeSpike: false,
        volatilityChanged: false,
        gate: { canEmitExecutableSignal: false, reason: "stale_data" },
      };
    }

    const prevVolume = this.lastVolume.get(tick.instrumentId);
    this.lastVolume.set(tick.instrumentId, tick.volume ?? 0);
    const volumeSpike = prevVolume !== undefined && (tick.volume ?? 0) > prevVolume * 2;

    const mid = tick.bid !== undefined && tick.ask !== undefined ? (tick.bid + tick.ask) / 2 : tick.last;
    const lastMid = this.lastVolatility.get(tick.instrumentId);
    this.lastVolatility.set(tick.instrumentId, mid);
    const volatilityChanged = lastMid !== undefined && Math.abs(mid - lastMid) / Math.max(lastMid, 0.0001) > 0.02;

    return {
      volumeSpike,
      volatilityChanged,
      gate: {
        canEmitExecutableSignal: !this.executableSignalBlocked,
        reason: this.executableSignalBlocked ? "stale_data_previously_detected" : undefined,
      },
    };
  }

  isOrderPathBlocked(): boolean {
    return this.executableSignalBlocked;
  }
}
