/** ForgeOS AI Orchestration — task runner (main pipeline). */

import { completeAITask } from "@/lib/ai-gateway/router";
import { getConfiguredProviders } from "@/lib/ai-gateway/provider";
import type { AIProviderId } from "@/lib/ai-gateway/types";
import { buildOrchestrationContext } from "./context-builder";
import { executeOrchestrationAi } from "./runtime-adapter";
import { writeCeoDecisionFromOutput, writeDecisionFromAi } from "./decision-graph-writer";
import { writeAiExecutionMemory } from "./memory-writer";
import { estimateTokens, registerExecutiveObservation } from "./observability";
import { getMockOutput } from "./mocks";
import { validateOrchestrationResponse } from "./response-validator";
import { getTaskDefinition } from "./task-registry";
import type {
  BoardOutput,
  BuildOutput,
  CeoOutput,
  OrchestratedAiResult,
  OrchestrationTaskId,
  VentureOrchestrationContext,
} from "./types";

export async function runOrchestratedAiTask<T = unknown>(
  taskId: OrchestrationTaskId,
  ventureContext: VentureOrchestrationContext
): Promise<OrchestratedAiResult<T>> {
  const def = getTaskDefinition(taskId);
  const started = Date.now();
  const warnings: string[] = [];
  let mockUsed = false;
  let fallbackUsed = false;
  let raw = "";
  let provider: AIProviderId = "mock";
  let model = "mock";
  let costEstimate = 0;

  const built = buildOrchestrationContext(taskId, ventureContext);
  const ventureId = ventureContext.ventureId ?? ventureContext.venture?.id;

  const hasLiveProvider = getConfiguredProviders().some((id) => id !== "mock");

  if (!hasLiveProvider && def.allowsMockFallback) {
    raw = getMockOutput(taskId, ventureContext.boardMember);
    mockUsed = true;
    warnings.push("No API keys configured — using orchestration mock.");
  } else {
    try {
      const department = def.relatedWorker;
      const aiResult = await executeOrchestrationAi({
        task: def.gatewayTask,
        system: built.system,
        user: built.user,
        ventureContext,
        department,
      });
      raw = aiResult.output;
      provider = aiResult.provider as AIProviderId;
      model = aiResult.model;
      fallbackUsed = aiResult.fallbackUsed;
      costEstimate = aiResult.costEstimate;
      warnings.push(...aiResult.warnings);
      if (provider === "mock") mockUsed = true;
    } catch (err) {
      if (!def.allowsMockFallback) throw err;
      raw = getMockOutput(taskId, ventureContext.boardMember);
      mockUsed = true;
      fallbackUsed = true;
      warnings.push(
        `Gateway failed, mock fallback used: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  let validation = validateOrchestrationResponse(taskId, raw);

  if (!validation.valid && def.allowsMockFallback) {
    raw = getMockOutput(taskId, ventureContext.boardMember);
    mockUsed = true;
    warnings.push(...validation.warnings, "Validation failed — mock fallback applied.");
    validation = validateOrchestrationResponse(taskId, raw);
  } else {
    warnings.push(...validation.warnings);
  }

  const latencyMs = Date.now() - started;
  const outputSize = raw.length;

  let decisionId: string | undefined;

  if (ventureId && validation.output) {
    if (taskId.startsWith("CEO_")) {
      const entry = writeCeoDecisionFromOutput(
        ventureId,
        taskId,
        validation.output as CeoOutput
      );
      decisionId = entry?.decisionId;
    } else if (taskId.startsWith("BOARD_")) {
      const board = validation.output as BoardOutput;
      const entry = writeDecisionFromAi({
        ventureId,
        sourceTask: taskId,
        title: `Board ${board.member}: ${board.vote}`,
        rationale: board.opinion ?? board.position,
        recommendation: board.suggestedAction ?? board.position,
        expectedImpact: `Confidence ${board.confidence}`,
        confidence: board.confidence,
        reversible: true,
        nodeType: "Recommendation",
      });
      decisionId = entry.decisionId;
    } else if (taskId.startsWith("BUILD_")) {
      const build = validation.output as BuildOutput;
      const entry = writeDecisionFromAi({
        ventureId,
        sourceTask: taskId,
        title: `Build: ${taskId}`,
        rationale: build.summary,
        recommendation: build.nextActions[0] ?? "Review build plan",
        expectedImpact: build.architecture.slice(0, 120),
        confidence: 0.7,
        reversible: true,
      });
      decisionId = entry.decisionId;
    }
  }

  const execution = writeAiExecutionMemory({
    taskId,
    provider,
    model,
    latencyMs,
    fallbackUsed: fallbackUsed || mockUsed,
    warnings,
    costEstimate,
    inputSize: built.inputSize,
    outputSize,
    ventureId,
    decisionId,
    estimatedTokens: estimateTokens(built.inputSize, outputSize),
  });

  registerExecutiveObservation({
    task: taskId,
    provider,
    model,
    latencyMs,
    estimatedTokens: estimateTokens(built.inputSize, outputSize),
    costEstimate,
    fallbackUsed: fallbackUsed || mockUsed,
    warnings,
    ventureId,
    decisionId,
  });

  return {
    taskId,
    output: (validation.output ?? JSON.parse(raw)) as T,
    raw,
    provider,
    model,
    fallbackUsed: fallbackUsed || mockUsed,
    mockUsed,
    warnings,
    costEstimate,
    latencyMs,
    executionId: execution.id,
    decisionId,
  };
}
