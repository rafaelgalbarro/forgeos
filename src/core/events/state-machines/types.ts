/** PROGRAM 6040 — State machine shared types */

export type MachineId =
  | "Mission"
  | "Output"
  | "Codebase"
  | "Build"
  | "Preview"
  | "Release"
  | "Deployment"
  | "Decision"
  | "ExecutionNode";

export interface TransitionGuardContext {
  readonly reason?: string;
  readonly actorId?: string;
  readonly resumeState?: string | null;
  readonly approvalGranted?: boolean;
  readonly blockResolved?: boolean;
  readonly metadata?: Readonly<Record<string, string | number | boolean | null>>;
}

export type TransitionGuard = (
  from: string,
  to: string,
  ctx: TransitionGuardContext
) => boolean;

export interface StateDefinition {
  readonly state: string;
  readonly label: string;
  readonly terminal: boolean;
  readonly recoverable: boolean;
  readonly description?: string;
}

export interface TransitionDefinition {
  readonly from: string;
  readonly to: string;
  readonly event: string;
  readonly guard?: TransitionGuard;
  readonly description?: string;
}

export interface StateMachineDefinition {
  readonly id: MachineId;
  readonly initial: string;
  readonly states: readonly StateDefinition[];
  readonly transitions: readonly TransitionDefinition[];
  readonly events: readonly string[];
}

export interface TransitionResult {
  readonly ok: boolean;
  readonly from: string;
  readonly to: string;
  readonly machineId: MachineId;
  readonly event: string;
  readonly reason?: string;
}
