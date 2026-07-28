/** ForgeOS Worker Runtime — State Machine adapter (Epic 4.3). */

import type { VentureStateMachine } from "../state-machine/types";
import type { VentureState } from "../state-machine/types";
import type { WorkerInstance } from "./types";

export interface StateMachineEligibilityResult {
  allowed: boolean;
  workerId: string;
  ventureState: VentureState;
  allowedStates: VentureState[];
  reason: string;
}

export function checkStateMachineEligibility(
  worker: WorkerInstance,
  ventureState: VentureState,
): StateMachineEligibilityResult {
  const allowed = worker.allowedStates.includes(ventureState);
  return {
    allowed,
    workerId: worker.id,
    ventureState,
    allowedStates: worker.allowedStates,
    reason: allowed
      ? `Worker ${worker.id} is allowed in state ${ventureState}`
      : `Worker ${worker.id} cannot run in state ${ventureState}. Allowed: ${worker.allowedStates.join(", ")}`,
  };
}

export function getVentureState(
  stateMachine: VentureStateMachine,
  ventureId: string,
): VentureState {
  return stateMachine.getState(ventureId);
}

export function filterWorkersByVentureState(
  workers: WorkerInstance[],
  ventureState: VentureState,
): WorkerInstance[] {
  return workers.filter((w) => w.allowedStates.includes(ventureState));
}

export function validateWorkerForState(
  worker: WorkerInstance,
  stateMachine: VentureStateMachine,
  ventureId: string,
): StateMachineEligibilityResult {
  const state = getVentureState(stateMachine, ventureId);
  return checkStateMachineEligibility(worker, state);
}
