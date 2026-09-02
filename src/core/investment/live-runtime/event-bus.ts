import type { EventEnvelope, RuntimeEventType } from "./types";

type Handler<TPayload extends Record<string, unknown>> = (event: EventEnvelope<TPayload>) => void;

export class LiveEventBus {
  private readonly handlers = new Map<RuntimeEventType, Set<Handler<Record<string, unknown>>>>();
  private readonly history: EventEnvelope<Record<string, unknown>>[] = [];

  publish<TPayload extends Record<string, unknown>>(event: EventEnvelope<TPayload>): void {
    this.history.push(event as EventEnvelope<Record<string, unknown>>);
    if (this.history.length > 2000) this.history.shift();
    const target = this.handlers.get(event.type);
    if (!target) return;
    for (const handler of target.values()) handler(event as EventEnvelope<Record<string, unknown>>);
  }

  subscribe<TPayload extends Record<string, unknown>>(
    type: RuntimeEventType,
    handler: Handler<TPayload>,
  ): () => void {
    const set = this.handlers.get(type) ?? new Set();
    set.add(handler as Handler<Record<string, unknown>>);
    this.handlers.set(type, set);
    return () => {
      set.delete(handler as Handler<Record<string, unknown>>);
      if (set.size === 0) this.handlers.delete(type);
    };
  }

  listEvents(limit = 100): readonly EventEnvelope<Record<string, unknown>>[] {
    return this.history.slice(-limit);
  }
}
