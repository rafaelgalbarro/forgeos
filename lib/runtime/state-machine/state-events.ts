/** ForgeOS Venture State Machine — Event Bus emission (Epic 4.2). */

import type { RuntimeEventBus } from "../event-bus/types";
import type { PublishInput, RuntimeEventType } from "../event-bus/types";
import { formatTransitionSummary } from "./scheduler-suggestions";
import type { VentureState } from "./types";

export type StateMachineEventType =
  | "VENTURE_STATE_CHANGED"
  | "VENTURE_BLOCKED"
  | "VENTURE_PAUSED"
  | "VENTURE_READY_FOR_BUILD"
  | "VENTURE_READY_FOR_LAUNCH"
  | "VENTURE_READY_FOR_CAPITAL";

export interface VentureStateChangedPayload {
  ventureId: string;
  from: VentureState;
  to: VentureState;
  reason: string;
  triggeredBy: string;
  summary?: string;
}

export interface VentureLifecycleSignalPayload {
  ventureId: string;
  state: VentureState;
  reason: string;
  triggeredBy: string;
}

const SOURCE = "venture-state-machine";

export function emitStateTransitionEvents(
  bus: RuntimeEventBus,
  input: {
    ventureId: string;
    from: VentureState;
    to: VentureState;
    reason: string;
    triggeredBy: string;
  },
): string[] {
  const emittedIds: string[] = [];
  const summary = formatTransitionSummary(input.from, input.to);

  const stateChanged = bus.publish({
    type: "VENTURE_STATE_CHANGED",
    source: SOURCE,
    payload: {
      ventureId: input.ventureId,
      from: input.from,
      to: input.to,
      reason: input.reason,
      triggeredBy: input.triggeredBy,
      summary,
    },
  } satisfies PublishInput<"VENTURE_STATE_CHANGED">);
  emittedIds.push(stateChanged.id);

  if (input.to === "PAUSED") {
    const evt = bus.publish({
      type: "VENTURE_PAUSED",
      source: SOURCE,
      payload: {
        ventureId: input.ventureId,
        state: input.to,
        reason: input.reason,
        triggeredBy: input.triggeredBy,
      },
    } satisfies PublishInput<"VENTURE_PAUSED">);
    emittedIds.push(evt.id);
  }

  if (input.to === "BLOCKED") {
    const evt = bus.publish({
      type: "VENTURE_BLOCKED",
      source: SOURCE,
      payload: {
        ventureId: input.ventureId,
        state: input.to,
        reason: input.reason,
        triggeredBy: input.triggeredBy,
      },
    } satisfies PublishInput<"VENTURE_BLOCKED">);
    emittedIds.push(evt.id);
  }

  if (input.to === "BUILD") {
    const evt = bus.publish({
      type: "VENTURE_READY_FOR_BUILD",
      source: SOURCE,
      payload: {
        ventureId: input.ventureId,
        state: input.to,
        reason: input.reason,
        triggeredBy: input.triggeredBy,
      },
    } satisfies PublishInput<"VENTURE_READY_FOR_BUILD">);
    emittedIds.push(evt.id);
  }

  if (input.to === "LAUNCH") {
    const evt = bus.publish({
      type: "VENTURE_READY_FOR_LAUNCH",
      source: SOURCE,
      payload: {
        ventureId: input.ventureId,
        state: input.to,
        reason: input.reason,
        triggeredBy: input.triggeredBy,
      },
    } satisfies PublishInput<"VENTURE_READY_FOR_LAUNCH">);
    emittedIds.push(evt.id);
  }

  if (input.to === "CAPITAL") {
    const evt = bus.publish({
      type: "VENTURE_READY_FOR_CAPITAL",
      source: SOURCE,
      payload: {
        ventureId: input.ventureId,
        state: input.to,
        reason: input.reason,
        triggeredBy: input.triggeredBy,
      },
    } satisfies PublishInput<"VENTURE_READY_FOR_CAPITAL">);
    emittedIds.push(evt.id);
  }

  return emittedIds;
}

export const STATE_MACHINE_EVENT_TYPES: StateMachineEventType[] = [
  "VENTURE_STATE_CHANGED",
  "VENTURE_BLOCKED",
  "VENTURE_PAUSED",
  "VENTURE_READY_FOR_BUILD",
  "VENTURE_READY_FOR_LAUNCH",
  "VENTURE_READY_FOR_CAPITAL",
];

export function isStateMachineEventType(type: string): type is StateMachineEventType {
  return (STATE_MACHINE_EVENT_TYPES as string[]).includes(type);
}

export function listStateMachineEventTypes(): RuntimeEventType[] {
  return [...STATE_MACHINE_EVENT_TYPES];
}
