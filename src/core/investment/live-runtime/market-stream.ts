import type { BrokerEngine } from "@/src/core/application/ports/broker-engine";
import type { InstrumentDefinition, MarketTickPayload } from "./types";

export interface MarketStreamTickBatch {
  readonly ticks: readonly MarketTickPayload[];
  readonly capturedAtUtc: string;
}

export class MarketStream {
  constructor(private readonly brokerEngine: BrokerEngine) {}

  async pull(instruments: readonly InstrumentDefinition[]): Promise<MarketStreamTickBatch> {
    const response = await this.brokerEngine.request<{ ticks: MarketTickPayload[] }>({
      path: "/market/stream",
      method: "POST",
      body: JSON.stringify({
        instruments: instruments.map((instrument) => instrument.symbol),
      }),
    });
    return {
      ticks: response.ticks.map((tick) => ({
        ...tick,
        capturedAtUtc: new Date(tick.capturedAtUtc).toISOString(),
      })),
      capturedAtUtc: new Date().toISOString(),
    };
  }
}
