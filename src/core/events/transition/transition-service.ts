/**
 * PROGRAM 6040 — Pure Transition Service
 * All aggregate status changes must go through this API (or aggregate methods).
 * Direct entity.status = "READY" assignments outside authorized paths are prohibited
 * (enforced via architecture:check heuristic — see docs).
 */

import type { Result } from "../../domain/shared/result";
import { err, ok } from "../../domain/shared/result";
import { DomainError } from "../../domain/shared/errors";
import {
  findTransition,
  getStateMachine,
  type MachineId,
  type TransitionGuardContext,
  type TransitionResult,
} from "../state-machines";

export interface ApplyTransitionInput {
  readonly machineId: MachineId;
  readonly from: string;
  readonly to: string;
  readonly event: string;
  readonly context?: TransitionGuardContext;
}

export interface TransitionService {
  canTransition(input: ApplyTransitionInput): boolean;
  applyTransition(input: ApplyTransitionInput): Result<TransitionResult, DomainError>;
  allowedTargets(
    machineId: MachineId,
    from: string,
    context?: TransitionGuardContext
  ): string[];
  isTerminal(machineId: MachineId, state: string): boolean;
  isRecoverable(machineId: MachineId, state: string): boolean;
}

export function createTransitionService(): TransitionService {
  return {
    canTransition(input) {
      const machine = getStateMachine(input.machineId);
      const transition = findTransition(machine, input.from, input.to, input.event);
      if (!transition) return false;
      if (transition.guard) {
        return transition.guard(input.from, input.to, input.context ?? {});
      }
      return true;
    },

    applyTransition(input) {
      const machine = getStateMachine(input.machineId);
      const transition = findTransition(machine, input.from, input.to, input.event);
      if (!transition) {
        return err(
          DomainError.invalidTransition(input.machineId, input.from, input.to)
        );
      }
      if (transition.guard && !transition.guard(input.from, input.to, input.context ?? {})) {
        return err(
          DomainError.invariant(
            input.machineId,
            `Guard rejected ${input.from}→${input.to} via ${input.event}`
          )
        );
      }
      return ok({
        ok: true,
        from: input.from,
        to: input.to,
        machineId: input.machineId,
        event: input.event,
        reason: input.context?.reason,
      } satisfies TransitionResult);
    },

    allowedTargets(machineId, from, context = {}) {
      const machine = getStateMachine(machineId);
      return machine.transitions
        .filter((t) => t.from === from)
        .filter((t) => (t.guard ? t.guard(from, t.to, context) : true))
        .map((t) => t.to);
    },

    isTerminal(machineId, state) {
      const machine = getStateMachine(machineId);
      return machine.states.some((s) => s.state === state && s.terminal);
    },

    isRecoverable(machineId, state) {
      const machine = getStateMachine(machineId);
      return machine.states.some((s) => s.state === state && s.recoverable);
    },
  };
}

/** Shared singleton for application/orchestration layers */
let shared: TransitionService | null = null;

export function getSharedTransitionService(): TransitionService {
  if (!shared) shared = createTransitionService();
  return shared;
}

export function resetSharedTransitionService(): void {
  shared = null;
}

/**
 * Marker symbol — authorized mutation sites may import this to signal
 * architecture:check that status writes are intentional.
 */
export const AUTHORIZED_STATUS_TRANSITION = "forgeos:authorized-status-transition" as const;
