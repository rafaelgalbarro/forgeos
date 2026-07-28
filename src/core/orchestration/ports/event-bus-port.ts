/** PROGRAM 6030 — Event Bus adapter (kernel events → Runtime Event Bus). */

import { createKernelEvent, type KernelEvent, type KernelEventType } from "./kernel-events";
import type { EventBusPort } from "./types";

type RuntimePublish = (input: {
  type: string;
  source: string;
  payload: Record<string, unknown>;
}) => unknown;

const KERNEL_TO_RUNTIME: Partial<Record<KernelEventType, string>> = {
  MISSION_CREATED: "SESSION_CREATED",
  MISSION_STARTED: "EXECUTION_STARTED",
  MISSION_COMPLETED: "EXECUTION_FINISHED",
  MISSION_FAILED: "EXECUTION_FAILED",
  MISSION_CANCELLED: "TASK_CANCELLED",
  MISSION_PAUSED: "WORKER_PAUSED",
  MISSION_RESUMED: "WORKER_RESUMED",
  NODE_STARTED: "TASK_STARTED",
  NODE_COMPLETED: "TASK_COMPLETED",
  NODE_FAILED: "TASK_FAILED",
  NODE_SKIPPED: "TASK_CANCELLED",
  PLAN_APPROVED: "VENTURE_APPROVED",
  APPROVAL_REQUESTED: "CEO_DECISION_CREATED",
  APPROVAL_GRANTED: "BOARD_CONSENSUS_REACHED",
};

export function createInMemoryEventBusPort(runtimePublish?: RuntimePublish): EventBusPort {
  const history: KernelEvent[] = [];

  return {
    publishDomainEvent(event: KernelEvent): void {
      history.push(event);
      if (history.length > 500) history.shift();

      if (runtimePublish) {
        const mapped = KERNEL_TO_RUNTIME[event.type];
        if (mapped) {
          try {
            runtimePublish({
              type: mapped,
              source: event.source,
              payload: {
                missionId: event.missionId,
                domainEventType: event.type,
                domainEventId: event.id,
                ...event.payload,
              },
            });
          } catch {
            // Adapter must not break kernel when runtime registry rejects unknown shapes.
          }
        }
      }
    },
    getHistory(limit = 50): KernelEvent[] {
      return history.slice(-limit);
    },
  };
}

export async function createRuntimeEventBusPort(): Promise<EventBusPort> {
  try {
    const mod = await import("@/lib/runtime/event-bus");
    const bus = mod.getSharedRuntimeEventBus();
    return createInMemoryEventBusPort((input) => {
      try {
        return bus.publish(input as never);
      } catch {
        return undefined;
      }
    });
  } catch {
    return createInMemoryEventBusPort();
  }
}

export function emit(
  port: EventBusPort,
  type: KernelEventType,
  missionId: string,
  payload: Record<string, unknown>,
): KernelEvent {
  const event = createKernelEvent(type, missionId, payload);
  port.publishDomainEvent(event);
  return event;
}
