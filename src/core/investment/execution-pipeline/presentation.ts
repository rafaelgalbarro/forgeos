import type { RunPipelineResult } from "./application";
import type { ExecutionPipelineStage, ExecutionPipelineState } from "./domain";

export interface PipelineTraceDto {
  readonly stage: ExecutionPipelineStage;
  readonly sequence: number;
  readonly passed: boolean;
  readonly reason: string;
  readonly artifact: Readonly<Record<string, unknown>>;
}

export interface PipelineDecisionExplanationDto {
  readonly whyEnter: string;
  readonly whyNotEnter: string;
  readonly quantity: number;
  readonly price: number;
  readonly stop: number;
  readonly target: number;
  readonly duration: string;
  readonly monetaryRisk: number;
  readonly percentRisk: number;
  readonly portfolioImpact: string;
  readonly estimatedCost: number;
  readonly liquidity: string;
  readonly marketSession: string;
  readonly cancellationConditions: readonly string[];
}

export interface ExecutionPipelineResultDto {
  readonly pipelineId: string;
  readonly finalState: ExecutionPipelineState;
  readonly trace: readonly PipelineTraceDto[];
  readonly explanation?: PipelineDecisionExplanationDto;
}

export function toExecutionPipelineResultDto(result: RunPipelineResult): ExecutionPipelineResultDto {
  return {
    pipelineId: result.pipelineId,
    finalState: result.finalState,
    trace: result.trace.map((stage) => ({
      stage: stage.stage,
      sequence: stage.sequence,
      passed: stage.passed,
      reason: stage.reason,
      artifact: stage.artifact as unknown as Readonly<Record<string, unknown>>,
    })),
    explanation: result.explanation,
  };
}
