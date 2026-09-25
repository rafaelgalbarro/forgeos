import type { BrokerEngine, BrokerEngineRequest } from "@/src/core/application/ports/broker-engine";

export class FutureBrokerEngine implements BrokerEngine {
  readonly name = "future" as const;

  async request<T>(_request: BrokerEngineRequest): Promise<T> {
    throw new Error("FutureBrokerEngine is a scaffold. Provide an implementation for this provider.");
  }
}

export function createFutureBrokerEngine(): BrokerEngine {
  return new FutureBrokerEngine();
}
