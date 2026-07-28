/** ForgeOS Execution Engine — pipeline states (Epic 4.5). */

export type ExecutionPipelineState =
  | "READY"
  | "DISPATCHED"
  | "VALIDATED"
  | "RUNNING"
  | "FINISHED"
  | "COMPLETED"
  | "FAILED"
  | "RETRY"
  | "DEAD_LETTER";

export const PIPELINE_STATE_LABELS: Record<ExecutionPipelineState, string> = {
  READY: "Ready",
  DISPATCHED: "Dispatched",
  VALIDATED: "Validated",
  RUNNING: "Running",
  FINISHED: "Finished",
  COMPLETED: "Completed",
  FAILED: "Failed",
  RETRY: "Retry",
  DEAD_LETTER: "Dead Letter",
};

const ALLOWED_TRANSITIONS: Record<ExecutionPipelineState, ExecutionPipelineState[]> = {
  READY: ["DISPATCHED", "FAILED"],
  DISPATCHED: ["VALIDATED", "FAILED"],
  VALIDATED: ["RUNNING", "FAILED"],
  RUNNING: ["FINISHED", "FAILED"],
  FINISHED: ["COMPLETED", "FAILED"],
  COMPLETED: [],
  FAILED: ["RETRY", "DEAD_LETTER"],
  RETRY: ["READY", "DEAD_LETTER"],
  DEAD_LETTER: [],
};

export function canTransitionPipeline(
  from: ExecutionPipelineState,
  to: ExecutionPipelineState,
): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isTerminalPipelineState(state: ExecutionPipelineState): boolean {
  return state === "COMPLETED" || state === "DEAD_LETTER";
}

export function isFailurePipelineState(state: ExecutionPipelineState): boolean {
  return state === "FAILED" || state === "RETRY" || state === "DEAD_LETTER";
}
