/**
 * ForgeOS AI Operating System — main pipeline (RC6).
 *
 * Executive Mesh → AI Runtime → Prompt Compiler → Context Engine → Model Router
 * → Provider Adapter → Telemetry → Memory → Decision Graph → Executive Response
 */

import { completeAITask } from "@/lib/ai-gateway/router";
import { getPolicyForTask } from "@/lib/ai-gateway/model-policy";
import { isRealAiEnabled, isStreamingEnabled } from "./config";
import { compilePrompt } from "./prompt-compiler";
import { compilePromptV2 } from "./prompt-compiler/v2";
import { routeModel } from "./router";
import { routeModelV2 } from "./router/v2";
import { executeWithRuntimeAdapter, executeWithProviderAdapter, isRuntimeProviderConfigured } from "./providers";
import { writeSharedMemory } from "./memory";
import { writeRuntimeDecision } from "./decision-graph";
import { recordAIRuntimeTelemetry } from "./telemetry";
import { recordExtendedTelemetry } from "./telemetry/v2";
import { runExecutiveReasoning, toExecutiveSummary } from "./executive-reasoning";
import { createStreamSession, simulateStream } from "./streaming";
import type { AIRuntimeRequest, AIRuntimeResponse, RuntimeProviderId } from "./types";
import type { ContextV2Input } from "./context-engine/v2";

async function executeWithFallbackChain(
  request: AIRuntimeRequest,
  compiled: { system: string; user: string },
  chain: RuntimeProviderId[],
  useRealProviders: boolean
): Promise<{
  output: string;
  provider: RuntimeProviderId;
  model: string;
  fallbackUsed: boolean;
  costEstimate: number;
  inputTokens: number;
  outputTokens: number;
  warnings: string[];
  retries: number;
}> {
  const warnings: string[] = [];
  let lastError: Error | null = null;
  let retries = 0;

  for (let i = 0; i < chain.length; i++) {
    const provider = chain[i]!;
    if (!isRuntimeProviderConfigured(provider) && provider !== "mock") continue;

    try {
      if (provider === "mock" || !useRealProviders) {
        const gateway = await completeAITask({
          task: request.task,
          system: compiled.system,
          user: compiled.user,
          provider: "mock",
        });
        return {
          output: gateway.output,
          provider: "mock",
          model: gateway.model,
          fallbackUsed: i > 0,
          costEstimate: gateway.costEstimate,
          inputTokens: Math.ceil((compiled.system.length + compiled.user.length) / 4),
          outputTokens: Math.ceil(gateway.output.length / 4),
          warnings: [...warnings, ...gateway.warnings],
          retries,
        };
      }

      if (useRealProviders) {
        const policy = getPolicyForTask(request.task);
        const result = await executeWithProviderAdapter({
          provider,
          task: request.task,
          system: compiled.system,
          user: compiled.user,
          temperature: policy.temperature,
          maxTokens: policy.maxTokens,
          requiresJson: policy.requiresJson,
        });
        return {
          output: result.output,
          provider: result.provider,
          model: result.model,
          fallbackUsed: i > 0,
          costEstimate: result.costEstimate,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          warnings,
          retries,
        };
      }

      const result = await executeWithRuntimeAdapter({
        provider,
        task: request.task,
        system: compiled.system,
        user: compiled.user,
      });

      return {
        output: result.output,
        provider: result.provider,
        model: result.model,
        fallbackUsed: i > 0,
        costEstimate: result.costEstimate,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        warnings,
        retries,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      warnings.push(`${provider}: ${lastError.message}`);
      retries++;
    }
  }

  const gateway = await completeAITask({
    task: request.task,
    system: compiled.system,
    user: compiled.user,
  });

  return {
    output: gateway.output,
    provider: gateway.provider as RuntimeProviderId,
    model: gateway.model,
    fallbackUsed: true,
    costEstimate: gateway.costEstimate,
    inputTokens: Math.ceil((compiled.system.length + compiled.user.length) / 4),
    outputTokens: Math.ceil(gateway.output.length / 4),
    warnings: [...warnings, ...gateway.warnings, "Full chain fallback to gateway"],
    retries,
  };
}

export async function runAIRuntime(request: AIRuntimeRequest): Promise<AIRuntimeResponse> {
  const started = Date.now();
  const writeMemory = request.writeMemory !== false;
  const writeDecision = request.writeDecision !== false && Boolean(request.context?.ventureId);
  const useRealAi = isRealAiEnabled();

  const contextV2: ContextV2Input = {
    ...request.context,
    department: request.context?.metadata?.department as string | undefined,
    capability: request.context?.metadata?.capability as string | undefined,
    skill: request.context?.metadata?.skill as string | undefined,
  };

  const compiled = useRealAi
    ? compilePromptV2({
        task: request.task,
        userInput: request.userInput,
        systemPrompt: request.systemPrompt,
        context: contextV2,
      })
    : compilePrompt({
        task: request.task,
        userInput: request.userInput,
        systemPrompt: request.systemPrompt,
        context: request.context,
      });

  const routing = useRealAi
    ? routeModelV2({
        task: request.task,
        optimizer: request.optimizer,
        providerOverride: request.providerOverride,
        department: contextV2.department,
      })
    : routeModel({
        task: request.task,
        optimizer: request.optimizer,
        providerOverride: request.providerOverride,
      });

  const execution = await executeWithFallbackChain(
    request,
    compiled,
    routing.providerChain,
    useRealAi
  );

  const latencyMs = Date.now() - started;
  const reasoning = runExecutiveReasoning({
    question: request.userInput,
    context: compiled.system.slice(0, 500),
    department: contextV2.department,
  });
  const executiveSummary = toExecutiveSummary(reasoning);
  const confidence = execution.fallbackUsed ? executiveSummary.confidence * 0.85 : executiveSummary.confidence;

  let memoryId: string | undefined;
  let decisionId: string | undefined;

  if (writeMemory) {
    const mem = writeSharedMemory({
      task: request.task,
      provider: execution.provider,
      model: execution.model,
      ventureId: request.context?.ventureId,
      system: compiled.system,
      user: compiled.user,
      output: execution.output,
      latencyMs,
      costEstimate: execution.costEstimate,
      fallbackUsed: execution.fallbackUsed,
    });
    memoryId = mem.memoryId;
  }

  if (writeDecision && request.context?.ventureId) {
    decisionId = writeRuntimeDecision({
      ventureId: request.context.ventureId,
      task: request.task,
      output: execution.output,
      confidence,
    });
  }

  const telemetry = recordAIRuntimeTelemetry({
    task: request.task,
    provider: execution.provider,
    model: execution.model,
    latencyMs,
    inputTokens: execution.inputTokens,
    outputTokens: execution.outputTokens,
    costEstimate: execution.costEstimate,
    fallbackUsed: execution.fallbackUsed,
    ventureId: request.context?.ventureId,
    decisionId,
    routing,
    confidence,
  });

  if (useRealAi) {
    recordExtendedTelemetry({
      task: request.task,
      provider: execution.provider,
      model: execution.model,
      promptTokens: execution.inputTokens,
      completionTokens: execution.outputTokens,
      latencyMs,
      costEstimate: execution.costEstimate,
      cacheHit: false,
      fallbackUsed: execution.fallbackUsed,
      retries: execution.retries,
      confidence,
      department: contextV2.department,
      capability: contextV2.capability,
      skill: contextV2.skill,
      streaming: isStreamingEnabled(),
    });
  }

  if (isStreamingEnabled() && useRealAi) {
    createStreamSession(execution.provider, execution.model);
  }

  return {
    output: execution.output,
    provider: execution.provider,
    model: execution.model,
    fallbackUsed: execution.fallbackUsed,
    costEstimate: execution.costEstimate,
    latencyMs,
    warnings: execution.warnings,
    routing,
    telemetryId: telemetry.id,
    memoryId,
    decisionId,
    confidence,
    metadata: {
      sourcesUsed: compiled.sourcesUsed,
      inputTokensEstimate: compiled.inputTokensEstimate,
      optimizer: routing.optimizer,
      realAi: useRealAi,
      executiveSummary: executiveSummary.summary,
      recommendation: executiveSummary.recommendation,
      uncertainty: executiveSummary.uncertainty,
      streamingEnabled: isStreamingEnabled(),
    },
  };
}

/** Drop-in replacement for completeAITask — routes through AI OS. */
export async function completeViaAIRuntime(params: {
  task: AIRuntimeRequest["task"];
  system: string;
  user: string;
  ventureId?: string;
  optimizer?: AIRuntimeRequest["optimizer"];
  context?: AIRuntimeRequest["context"];
}): Promise<AIRuntimeResponse> {
  return runAIRuntime({
    task: params.task,
    userInput: params.user,
    systemPrompt: params.system,
    optimizer: params.optimizer,
    context: params.context ?? (params.ventureId
      ? { ventureId: params.ventureId, sources: ["memory", "knowledge", "decision-graph"] }
      : undefined),
  });
}

/** Stream AI runtime response progressively. */
export async function* streamAIRuntime(
  request: AIRuntimeRequest
): AsyncGenerator<{ delta: string; done: boolean }> {
  const result = await runAIRuntime(request);
  yield* simulateStream(result.output, result.provider, result.model);
}
