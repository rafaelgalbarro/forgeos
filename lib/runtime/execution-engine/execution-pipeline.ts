/** ForgeOS Execution Engine — pipeline state transitions (Epic 4.5). */

import type { ExecutionSession } from "./types";
import type { ExecutionPipelineState } from "./execution-status";
import { canTransitionPipeline } from "./execution-status";
import { transitionSessionPipeline } from "./execution-session";

export interface PipelineTransitionResult {
  session: ExecutionSession;
  valid: boolean;
  error?: string;
}

export function advancePipeline(
  session: ExecutionSession,
  to: ExecutionPipelineState,
  detail?: string,
): PipelineTransitionResult {
  if (!canTransitionPipeline(session.pipelineState, to)) {
    return {
      session,
      valid: false,
      error: `Invalid pipeline transition: ${session.pipelineState} → ${to}`,
    };
  }
  return {
    session: transitionSessionPipeline(session, to, detail),
    valid: true,
  };
}

export const PIPELINE_SUCCESS_PATH: ExecutionPipelineState[] = [
  "READY",
  "DISPATCHED",
  "VALIDATED",
  "RUNNING",
  "FINISHED",
  "COMPLETED",
];

export function getPipelineProgress(session: ExecutionSession): number {
  const idx = PIPELINE_SUCCESS_PATH.indexOf(session.pipelineState);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / PIPELINE_SUCCESS_PATH.length) * 100);
}
