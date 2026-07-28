/**
 * PROGRAM 6040 — Canonical event bus adapter.
 * DOES NOT create a new Event Bus — wraps existing Runtime / FOS / Live Mission buses.
 */

import type { DomainEventEnvelope } from "../envelope";
import { createDomainEventEnvelope } from "../envelope";
import type { EventLogRepository } from "../store";
import { createMemoryEventLog } from "../store";
import { defaultUpcasterPipeline } from "../versioning";
import type { EventObservabilityStore } from "../observability";
import {
  createEventObservabilityStore,
  finishProcessing,
  startProcessing,
} from "../observability";
import type { ProcessedEventRegistry } from "../idempotency";
import { createProcessedEventRegistry, handleIdempotently } from "../idempotency";

export type CanonicalEventHandler = (
  event: DomainEventEnvelope
) => void | Promise<void>;

export type Unsubscribe = () => void;

export interface CanonicalEventBus {
  publish(event: DomainEventEnvelope): Promise<DomainEventEnvelope>;
  subscribe(eventType: string, handler: CanonicalEventHandler): Unsubscribe;
  subscribeAll(handler: CanonicalEventHandler): Unsubscribe;
  subscribeIdempotent(
    handlerId: string,
    eventType: string | "*",
    handler: CanonicalEventHandler
  ): Unsubscribe;
  getLog(): EventLogRepository;
  getObservability(): EventObservabilityStore;
  getProcessedRegistry(): ProcessedEventRegistry;
}

export interface CanonicalEventBusOptions {
  readonly log?: EventLogRepository;
  readonly observability?: EventObservabilityStore;
  readonly processed?: ProcessedEventRegistry;
  readonly upcast?: boolean;
}

export function createCanonicalEventBus(
  options: CanonicalEventBusOptions = {}
): CanonicalEventBus {
  const log = options.log ?? createMemoryEventLog();
  const observability = options.observability ?? createEventObservabilityStore();
  const processed = options.processed ?? createProcessedEventRegistry();
  const upcast = options.upcast !== false;

  const byType = new Map<string, Set<CanonicalEventHandler>>();
  const globalHandlers = new Set<CanonicalEventHandler>();

  async function dispatch(event: DomainEventEnvelope): Promise<void> {
    const handlers = [
      ...(byType.get(event.eventType) ?? []),
      ...globalHandlers,
    ];
    for (const handler of handlers) {
      const started = startProcessing(observability, {
        handlerId: handler.name || "anonymous",
        eventId: String(event.eventId),
        eventType: event.eventType,
        correlationId: event.correlationId,
        causationId: event.causationId,
      });
      try {
        await handler(event);
        finishProcessing(observability, started, "succeeded");
      } catch (e) {
        finishProcessing(observability, started, "failed", {
          code: "HANDLER_ERROR",
          message: e instanceof Error ? e.message : String(e),
        });
      }
    }
  }

  return {
    async publish(raw) {
      const event = upcast ? defaultUpcasterPipeline(raw) : raw;
      await log.append(event);
      await dispatch(event);
      return event;
    },
    subscribe(eventType, handler) {
      if (!byType.has(eventType)) byType.set(eventType, new Set());
      byType.get(eventType)!.add(handler);
      return () => byType.get(eventType)?.delete(handler);
    },
    subscribeAll(handler) {
      globalHandlers.add(handler);
      return () => globalHandlers.delete(handler);
    },
    subscribeIdempotent(handlerId, eventType, handler) {
      const wrapped: CanonicalEventHandler = async (event) => {
        await handleIdempotently(processed, handlerId, event, handler);
      };
      Object.defineProperty(wrapped, "name", { value: handlerId });
      if (eventType === "*") return this.subscribeAll(wrapped);
      return this.subscribe(eventType, wrapped);
    },
    getLog: () => log,
    getObservability: () => observability,
    getProcessedRegistry: () => processed,
  };
}

let sharedCanonical: CanonicalEventBus | null = null;

export function getSharedCanonicalEventBus(): CanonicalEventBus {
  if (!sharedCanonical) sharedCanonical = createCanonicalEventBus();
  return sharedCanonical;
}

export function resetSharedCanonicalEventBus(): void {
  sharedCanonical = null;
}

/** Helper to publish a state-change domain event via transition result */
export function createStateChangedEnvelope(input: {
  aggregateType: DomainEventEnvelope["aggregateType"];
  aggregateId: string;
  workspaceId: string;
  missionId?: string;
  eventType: string;
  from: string;
  to: string;
  actorId?: string;
  correlationId?: string;
  reason?: string;
}): DomainEventEnvelope {
  return createDomainEventEnvelope({
    eventType: input.eventType,
    catalogKind: "domain",
    aggregateType: input.aggregateType,
    aggregateId: input.aggregateId,
    workspaceId: input.workspaceId,
    missionId: input.missionId,
    correlationId: input.correlationId,
    actor: { kind: "system", id: input.actorId ?? "transition-service" },
    payload: {
      from: input.from,
      to: input.to,
      status: input.to,
      reason: input.reason ?? null,
    },
  });
}
