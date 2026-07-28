/** ForgeOS Runtime Event Bus — pub/sub engine (Epic 4.0). */

import { getEventCategory } from "./registry";
import type {
  PublishInput,
  RuntimeEvent,
  RuntimeEventBus,
  RuntimeEventBusOptions,
  RuntimeEventCategory,
  RuntimeEventHandler,
  RuntimeEventType,
  Unsubscribe,
} from "./types";
import { assertValidPublishInput } from "./validator";

const DEFAULT_MAX_HISTORY = 500;

let eventCounter = 0;

function nextEventId(): string {
  eventCounter += 1;
  return `evt_${Date.now()}_${eventCounter}`;
}

export function createRuntimeEventBus(
  options: RuntimeEventBusOptions = {},
): RuntimeEventBus {
  const maxHistory = options.maxHistory ?? DEFAULT_MAX_HISTORY;
  const handlers = new Map<RuntimeEventType, Set<RuntimeEventHandler>>();
  const globalHandlers = new Set<RuntimeEventHandler>();
  const history: RuntimeEvent[] = [];

  function subscribe<T extends RuntimeEventType>(
    type: T,
    handler: RuntimeEventHandler<T>,
  ): Unsubscribe {
    if (!handlers.has(type)) {
      handlers.set(type, new Set());
    }
    const set = handlers.get(type)!;
    set.add(handler as RuntimeEventHandler);
    return () => set.delete(handler as RuntimeEventHandler);
  }

  function subscribeAll(handler: RuntimeEventHandler): Unsubscribe {
    globalHandlers.add(handler);
    return () => globalHandlers.delete(handler);
  }

  function unsubscribe(type: RuntimeEventType, handler: RuntimeEventHandler): boolean {
    return handlers.get(type)?.delete(handler) ?? false;
  }

  function publish<T extends RuntimeEventType>(input: PublishInput<T>): RuntimeEvent<T> {
    assertValidPublishInput(input);

    const event: RuntimeEvent<T> = {
      id: nextEventId(),
      type: input.type,
      category: getEventCategory(input.type),
      timestamp: input.timestamp ?? new Date().toISOString(),
      source: input.source,
      payload: input.payload,
    };

    history.push(event as RuntimeEvent);
    if (history.length > maxHistory) {
      history.splice(0, history.length - maxHistory);
    }

    handlers.get(event.type)?.forEach((handler) => handler(event as RuntimeEvent));
    globalHandlers.forEach((handler) => handler(event as RuntimeEvent));

    return event;
  }

  function getHistory(limit = 50): RuntimeEvent[] {
    if (limit <= 0) return [];
    return history.slice(-limit);
  }

  function getHistoryByType<T extends RuntimeEventType>(
    type: T,
    limit = 50,
  ): RuntimeEvent<T>[] {
    const filtered = history.filter((event) => event.type === type);
    return filtered.slice(-limit) as RuntimeEvent<T>[];
  }

  function getHistoryByCategory(
    category: RuntimeEventCategory,
    limit = 50,
  ): RuntimeEvent[] {
    const filtered = history.filter((event) => event.category === category);
    return filtered.slice(-limit);
  }

  function clear(): void {
    handlers.clear();
    globalHandlers.clear();
    history.length = 0;
  }

  return {
    publish,
    subscribe,
    subscribeAll,
    unsubscribe,
    getHistory,
    getHistoryByType,
    getHistoryByCategory,
    clear,
  };
}

/** Isolated singleton for cross-module runtime integration (opt-in). */
let sharedBus: RuntimeEventBus | null = null;

export function getSharedRuntimeEventBus(): RuntimeEventBus {
  if (!sharedBus) {
    sharedBus = createRuntimeEventBus();
  }
  return sharedBus;
}

export function resetSharedRuntimeEventBus(): void {
  sharedBus?.clear();
  sharedBus = null;
}

/** @internal Reset id counter for deterministic tests. */
export function __resetEventIdCounterForTests(): void {
  eventCounter = 0;
}
