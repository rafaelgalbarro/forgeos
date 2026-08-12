export type BrokerEngineName = "ibkr" | "paper" | "replay" | "future";

export type BrokerEngineRequest = {
  path: string;
  method: string;
  queryString?: string;
  body?: string;
  /** Optional abort signal for timed reads (UI snapshot paths). */
  signal?: AbortSignal;
};

export interface BrokerEngine {
  readonly name: BrokerEngineName;
  request<T>(request: BrokerEngineRequest): Promise<T>;
}
