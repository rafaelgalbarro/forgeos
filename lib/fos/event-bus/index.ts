import type { FosEvent, FosEventHandler, FosEventType } from "../types";

export interface FosEventBus {
  subscribe<T>(type: FosEventType, handler: FosEventHandler<T>): () => void;
  subscribeAll(handler: FosEventHandler): () => void;
  publish<T>(event: FosEvent<T>): void;
  getHistory(limit?: number): FosEvent[];
  clear(): void;
}

export function createEventBus(): FosEventBus {
  const handlers = new Map<FosEventType, Set<FosEventHandler>>();
  const globalHandlers = new Set<FosEventHandler>();
  const history: FosEvent[] = [];
  const MAX_HISTORY = 200;

  function subscribe<T>(type: FosEventType, handler: FosEventHandler<T>): () => void {
    if (!handlers.has(type)) handlers.set(type, new Set());
    handlers.get(type)!.add(handler as FosEventHandler);
    return () => handlers.get(type)?.delete(handler as FosEventHandler);
  }

  function subscribeAll(handler: FosEventHandler): () => void {
    globalHandlers.add(handler);
    return () => globalHandlers.delete(handler);
  }

  function publish<T>(event: FosEvent<T>): void {
    history.push(event as FosEvent);
    if (history.length > MAX_HISTORY) history.shift();

    handlers.get(event.type)?.forEach((h) => h(event));
    globalHandlers.forEach((h) => h(event));
  }

  function getHistory(limit = 50): FosEvent[] {
    return history.slice(-limit);
  }

  function clear(): void {
    handlers.clear();
    globalHandlers.clear();
    history.length = 0;
  }

  return { subscribe, subscribeAll, publish, getHistory, clear };
}

/** Shared singleton bus for cross-module FOS integration. */
let sharedBus: FosEventBus | null = null;

export function getSharedEventBus(): FosEventBus {
  if (!sharedBus) sharedBus = createEventBus();
  return sharedBus;
}
