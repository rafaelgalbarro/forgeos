import type { BrokerEngine } from "@/src/core/application/ports/broker-engine";
import type { InstrumentDefinition, MarketDataPort, MarketTick } from "../domain";

/**
 * Read-only market data adapter. Uses BrokerEngine.request for market stream pulls only.
 * Does not modify BrokerEngine and never submits orders.
 */
export class BrokerMarketDataAdapter implements MarketDataPort {
  constructor(private readonly brokerEngine: BrokerEngine) {}

  async pullTicks(instruments: readonly InstrumentDefinition[]): Promise<readonly MarketTick[]> {
    const response = await this.brokerEngine.request<{ ticks: MarketTick[] }>({
      path: "/market/stream",
      method: "POST",
      body: JSON.stringify({
        instruments: instruments.map((instrument) => instrument.symbol),
      }),
    });
    return response.ticks.map((tick) => ({
      ...tick,
      capturedAtUtc: new Date(tick.capturedAtUtc).toISOString(),
    }));
  }
}

export class InMemoryMarketDataPort implements MarketDataPort {
  private readonly queue: Array<{ ticks?: readonly MarketTick[]; fail?: boolean }> = [];

  pushTicks(ticks: readonly MarketTick[]): void {
    this.queue.push({ ticks });
  }

  pushFailure(): void {
    this.queue.push({ fail: true });
  }

  async pullTicks(_instruments: readonly InstrumentDefinition[]): Promise<readonly MarketTick[]> {
    const next = this.queue.shift() ?? { ticks: [] };
    if (next.fail) throw new Error("market data stream failure");
    return next.ticks ?? [];
  }
}
