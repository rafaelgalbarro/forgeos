/** ForgeOS Venture State Machine — main engine (Epic 4.2). */

import type { RuntimeEventBus } from "../event-bus/types";
import { evaluateGuard } from "./guards";
import { VentureStateHistoryStore, nextHistoryId } from "./history";
import { suggestSchedulerTasks } from "./scheduler-suggestions";
import { DEFAULT_VENTURE_STATE, isActiveState } from "./states";
import { emitStateTransitionEvents } from "./state-events";
import {
  getExpandedAllowedTargets,
  isStructurallyAllowed,
} from "./transitions";
import type {
  GuardResult,
  TransitionHistoryRecord,
  TransitionInput,
  TransitionResult,
  VentureState,
  VentureStateContext,
  VentureStateMachine,
  VentureStateMachineOptions,
  VentureStateSnapshot,
} from "./types";

interface VentureRecord {
  state: VentureState;
  resumeState: VentureState | null;
  updatedAt: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function buildSnapshot(ventureId: string, record: VentureRecord): VentureStateSnapshot {
  return {
    ventureId,
    state: record.state,
    resumeState: record.resumeState,
    updatedAt: record.updatedAt,
  };
}

function failedTransition(
  from: VentureState,
  to: VentureState,
  guard: GuardResult,
): TransitionResult {
  return {
    success: false,
    from,
    to,
    guard,
    suggestedTasks: [],
    emittedEventIds: [],
  };
}

export function createVentureStateMachine(
  options: VentureStateMachineOptions = {},
  eventBus?: RuntimeEventBus,
): VentureStateMachine {
  const historyStore = new VentureStateHistoryStore(options.maxHistory);
  const ventures = new Map<string, VentureRecord>();

  function getOrCreateRecord(ventureId: string): VentureRecord {
    let record = ventures.get(ventureId);
    if (!record) {
      record = {
        state: DEFAULT_VENTURE_STATE,
        resumeState: null,
        updatedAt: nowIso(),
      };
      ventures.set(ventureId, record);
    }
    return record;
  }

  function getState(ventureId: string): VentureState {
    return getOrCreateRecord(ventureId).state;
  }

  function getSnapshot(ventureId: string): VentureStateSnapshot {
    return buildSnapshot(ventureId, getOrCreateRecord(ventureId));
  }

  function canTransition(
    ventureId: string,
    to: VentureState,
    context: VentureStateContext,
  ): GuardResult {
    const record = getOrCreateRecord(ventureId);
    const from = record.state;

    if (
      !isStructurallyAllowed(from, to, record.resumeState, context.blockResolved)
    ) {
      return {
        allowed: false,
        reason: `Transition from ${from} to ${to} is not allowed by the state machine.`,
        missingRequirements: [],
        warnings: [],
      };
    }

    return evaluateGuard(from, to, context, record.resumeState);
  }

  function getAvailableTransitions(
    ventureId: string,
    context: VentureStateContext,
  ): VentureState[] {
    const record = getOrCreateRecord(ventureId);
    const candidates = getExpandedAllowedTargets(
      record.state,
      record.resumeState,
      context.blockResolved,
    );

    return candidates.filter((to) => canTransition(ventureId, to, context).allowed);
  }

  function transition(input: TransitionInput): TransitionResult {
    const record = getOrCreateRecord(input.ventureId);
    const from = record.state;
    const guard = canTransition(input.ventureId, input.to, input.context);

    if (!guard.allowed) {
      return failedTransition(from, input.to, guard);
    }

    const previousActive = isActiveState(from) ? from : record.resumeState;

    if (input.to === "PAUSED" || input.to === "BLOCKED") {
      record.resumeState = isActiveState(from) ? from : record.resumeState;
    } else if (from === "PAUSED" || from === "BLOCKED") {
      record.resumeState = null;
    }

    record.state = input.to;
    record.updatedAt = nowIso();

    const historyRecord: TransitionHistoryRecord = {
      id: nextHistoryId(),
      ventureId: input.ventureId,
      from,
      to: input.to,
      reason: input.reason,
      triggeredBy: input.triggeredBy,
      createdAt: record.updatedAt,
      warnings: [...guard.warnings],
      metadata: {
        ...input.metadata,
        resumeState: record.resumeState,
        previousActive,
      },
    };

    historyStore.append(historyRecord);

    const suggestedTasks = suggestSchedulerTasks(from, input.to);

    let emittedEventIds: string[] = [];
    if (eventBus) {
      emittedEventIds = emitStateTransitionEvents(eventBus, {
        ventureId: input.ventureId,
        from,
        to: input.to,
        reason: input.reason,
        triggeredBy: input.triggeredBy,
      });
    }

    return {
      success: true,
      from,
      to: input.to,
      guard,
      historyRecord,
      suggestedTasks,
      emittedEventIds,
    };
  }

  function getHistory(ventureId?: string, limit = 50): TransitionHistoryRecord[] {
    return historyStore.getAll(ventureId, limit);
  }

  function clear(): void {
    ventures.clear();
    historyStore.clear();
  }

  return {
    getState,
    getSnapshot,
    canTransition,
    transition,
    getAvailableTransitions,
    getHistory,
    clear,
  };
}

/** Isolated singleton for cross-module runtime integration (opt-in). */
let sharedMachine: VentureStateMachine | null = null;

export function getSharedVentureStateMachine(
  eventBus?: RuntimeEventBus,
): VentureStateMachine {
  if (!sharedMachine) {
    sharedMachine = createVentureStateMachine({}, eventBus);
  }
  return sharedMachine;
}

export function resetSharedVentureStateMachine(): void {
  sharedMachine?.clear();
  sharedMachine = null;
}
