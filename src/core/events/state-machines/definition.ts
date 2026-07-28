/** PROGRAM 6040 — Helpers for building official state machines */

import type {
  MachineId,
  StateDefinition,
  StateMachineDefinition,
  TransitionDefinition,
  TransitionGuard,
  TransitionGuardContext,
} from "./types";

export function defineMachine(
  id: MachineId,
  initial: string,
  states: readonly StateDefinition[],
  transitions: readonly TransitionDefinition[],
  events: readonly string[]
): StateMachineDefinition {
  const stateIds = new Set(states.map((s) => s.state));
  if (!stateIds.has(initial)) {
    throw new Error(`${id}: initial state ${initial} not in states`);
  }
  for (const t of transitions) {
    if (!stateIds.has(t.from) || !stateIds.has(t.to)) {
      throw new Error(`${id}: transition ${t.from}→${t.to} references unknown state`);
    }
  }
  return Object.freeze({ id, initial, states, transitions, events });
}

export function alwaysAllow(): TransitionGuard {
  return () => true;
}

export function requireApproval(): TransitionGuard {
  return (_from, _to, ctx: TransitionGuardContext) => ctx.approvalGranted === true;
}

export function requireBlockResolved(): TransitionGuard {
  return (_from, _to, ctx: TransitionGuardContext) => ctx.blockResolved === true;
}

export function terminalStates(def: StateMachineDefinition): string[] {
  return def.states.filter((s) => s.terminal).map((s) => s.state);
}

export function recoverableStates(def: StateMachineDefinition): string[] {
  return def.states.filter((s) => s.recoverable).map((s) => s.state);
}

export function allowedTargets(
  def: StateMachineDefinition,
  from: string,
  ctx: TransitionGuardContext = {}
): string[] {
  return def.transitions
    .filter((t) => t.from === from)
    .filter((t) => (t.guard ? t.guard(from, t.to, ctx) : true))
    .map((t) => t.to);
}

export function findTransition(
  def: StateMachineDefinition,
  from: string,
  to: string,
  event?: string
): TransitionDefinition | undefined {
  return def.transitions.find(
    (t) => t.from === from && t.to === to && (event === undefined || t.event === event)
  );
}
