import type { BrokerEngine, BrokerEngineRequest } from "@/src/core/application/ports/broker-engine";
import { ibkrServiceFetch } from "@/lib/ibkr/service-client";
import { normalizePath } from "./utils";

export class IbkrBrokerEngine implements BrokerEngine {
  readonly name = "ibkr" as const;

  async request<T>(request: BrokerEngineRequest): Promise<T> {
    const path = normalizePath(request.path);
    const query = request.queryString ?? "";
    return ibkrServiceFetch<T>(`${path}${query}`, {
      method: request.method,
      body: request.body,
      signal: request.signal,
    });
  }
}

export function createIbkrBrokerEngine(): BrokerEngine {
  return new IbkrBrokerEngine();
}
