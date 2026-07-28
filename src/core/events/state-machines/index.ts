/** PROGRAM 6040 — Official state machines registry */

import type { MachineId, StateMachineDefinition } from "./types";
import { MissionStateMachine } from "./mission";
import { OutputStateMachine } from "./output";
import { CodebaseStateMachine } from "./codebase";
import { BuildStateMachine } from "./build";
import { PreviewStateMachine } from "./preview";
import { ReleaseStateMachine } from "./release";
import { DeploymentStateMachine } from "./deployment";
import { DecisionStateMachine } from "./decision";
import { ExecutionNodeStateMachine } from "./execution-node";
import {
  allowedTargets,
  findTransition,
  recoverableStates,
  terminalStates,
} from "./definition";

export type * from "./types";
export {
  defineMachine,
  alwaysAllow,
  requireApproval,
  requireBlockResolved,
  terminalStates,
  recoverableStates,
  allowedTargets,
  findTransition,
} from "./definition";

export {
  MissionStateMachine,
  OutputStateMachine,
  CodebaseStateMachine,
  BuildStateMachine,
  PreviewStateMachine,
  ReleaseStateMachine,
  DeploymentStateMachine,
  DecisionStateMachine,
  ExecutionNodeStateMachine,
};

export const OFFICIAL_STATE_MACHINES: readonly StateMachineDefinition[] = [
  MissionStateMachine,
  OutputStateMachine,
  CodebaseStateMachine,
  BuildStateMachine,
  PreviewStateMachine,
  ReleaseStateMachine,
  DeploymentStateMachine,
  DecisionStateMachine,
  ExecutionNodeStateMachine,
];

export function getStateMachine(id: MachineId): StateMachineDefinition {
  const found = OFFICIAL_STATE_MACHINES.find((m) => m.id === id);
  if (!found) throw new Error(`Unknown state machine: ${id}`);
  return found;
}

export function listStateMachineIds(): MachineId[] {
  return OFFICIAL_STATE_MACHINES.map((m) => m.id);
}
