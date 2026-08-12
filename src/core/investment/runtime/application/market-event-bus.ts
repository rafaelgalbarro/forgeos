import type {
  MarketRuntimeEventEnvelope,
  MarketRuntimeEventHandler,
  MarketRuntimeEventType,
} from "../domain";

export class MarketEventBus {
  private readonly handlers = new Map<MarketRuntimeEventType, Set<MarketRuntimeEventHandler>>();
  private readonly history: MarketRuntimeEventEnvelope[] = [];

  publish<TPayload extends Record<string, unknown>>(event: MarketRuntimeEventEnvelope<TPayload>): void {
    this.history.push(event as MarketRuntimeEventEnvelope);
    if (this.history.length > 2000) this.history.shift();
    const target = this.handlers.get(event.type);
    if (!target) return;
    for (const handler of target.values()) handler(event as MarketRuntimeEventEnvelope);
  }

  subscribe<TPayload extends Record<string, unknown>>(
    type: MarketRuntimeEventType,
    handler: MarketRuntimeEventHandler<TPayload>,
  ): () => void {
    const set = this.handlers.get(type) ?? new Set();
    set.add(handler as MarketRuntimeEventHandler);
    this.handlers.set(type, set);
    return () => {
      set.delete(handler as MarketRuntimeEventHandler);
      if (set.size === 0) this.handlers.delete(type);
    };
  }

  listEvents(limit = 100): readonly MarketRuntimeEventEnvelope[] {
    return this.history.slice(-limit);
  }

  clear(): void {
    this.history.length = 0;
    this.handlers.clear();
  }
}
