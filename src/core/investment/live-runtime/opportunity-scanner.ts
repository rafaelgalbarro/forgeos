import type { MarketTickPayload } from "./types";

export class OpportunityScanner {
  private readonly lastSpread = new Map<string, number>();

  inspect(tick: MarketTickPayload): { spreadChanged: boolean; spread: number | null } {
    if (tick.bid === undefined || tick.ask === undefined) return { spreadChanged: false, spread: null };
    const spread = tick.ask - tick.bid;
    const last = this.lastSpread.get(tick.instrumentId);
    this.lastSpread.set(tick.instrumentId, spread);
    return {
      spreadChanged: last !== undefined && Math.abs(spread - last) > 0.005,
      spread,
    };
  }
}
