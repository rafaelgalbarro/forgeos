/** ForgeOS Platform — event bus interface (stub). */

import type { PillarId, VentureId } from "./types";

export type PlatformEventType =
  | "pillar.initialized"
  | "pillar.health_check"
  | "venture.context_updated"
  | "adapter.invoked";

export interface PlatformEvent<TPayload = Record<string, unknown>> {
  type: PlatformEventType;
  ventureId?: VentureId;
  pillarId?: PillarId;
  payload: TPayload;
  timestamp: string;
}

export type PlatformEventHandler = (event: PlatformEvent) => void;

export interface PlatformEventBus {
  publish(event: PlatformEvent): void;
  subscribe(type: PlatformEventType, handler: PlatformEventHandler): () => void;
  clear(): void;
}

/** In-memory stub — not wired to app runtime. */
export function createPlatformEventBus(): PlatformEventBus {
  const handlers = new Map<PlatformEventType, Set<PlatformEventHandler>>();

  return {
    publish(event: PlatformEvent): void {
      const set = handlers.get(event.type);
      if (!set) return;
      for (const handler of set) {
        handler(event);
      }
    },

    subscribe(type: PlatformEventType, handler: PlatformEventHandler): () => void {
      let set = handlers.get(type);
      if (!set) {
        set = new Set();
        handlers.set(type, set);
      }
      set.add(handler);
      return () => {
        set?.delete(handler);
      };
    },

    clear(): void {
      handlers.clear();
    },
  };
}
