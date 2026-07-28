/** ForgeOS AI Orchestration — runtime adapter (RC6). Routes through AI Runtime when real AI active. */

import { isRealAiEnabled } from "@/lib/ai-runtime/config";
import { completeViaAIRuntime } from "@/lib/ai-runtime/pipeline";
import { completeAITask } from "@/lib/ai-gateway/router";
import type { AITask } from "@/lib/ai-gateway/types";
import {
  mergeWorkspaceIntoAiContext,
  type WorkspaceAiContextInput,
} from "@/lib/auth/ai-context-bridge";
import type { ContextV2Input } from "@/lib/ai-runtime/context-engine/v2";
import type { VentureOrchestrationContext } from "./types";

export interface OrchestrationAiResult {
  output: string;
  provider: string;
  model: string;
  fallbackUsed: boolean;
  costEstimate: number;
  inputTokens: number;
  outputTokens: number;
  warnings: string[];
  confidence: number;
}

export async function executeOrchestrationAi(params: {
  task: AITask;
  system: string;
  user: string;
  ventureContext?: VentureOrchestrationContext;
  department?: string;
  workspaceContext?: WorkspaceAiContextInput;
}): Promise<OrchestrationAiResult> {
  const ventureId = params.ventureContext?.ventureId ?? params.ventureContext?.venture?.id;

  const baseContext: ContextV2Input = {
    ventureId,
    ventureName: params.ventureContext?.venture?.name,
    sources: ["memory", "knowledge", "decision-graph", "build-context", "timeline", "founder"],
    researchSummary: params.ventureContext?.researchReport?.marketSummary,
    productSummary: params.ventureContext?.productPRD?.executiveSummary,
    metadata: {
      department: params.department,
      boardMember: params.ventureContext?.boardMember,
    },
  };

  const workspaceCtx =
    params.workspaceContext ??
    (params.ventureContext?.extra?.workspace as WorkspaceAiContextInput | undefined);

  const mergedContext = mergeWorkspaceIntoAiContext(baseContext, workspaceCtx);

  if (isRealAiEnabled()) {
    const runtime = await completeViaAIRuntime({
      task: params.task,
      system: params.system,
      user: params.user,
      ventureId,
      context: mergedContext,
    });

    return {
      output: runtime.output,
      provider: runtime.provider,
      model: runtime.model,
      fallbackUsed: runtime.fallbackUsed,
      costEstimate: runtime.costEstimate,
      inputTokens: (runtime.metadata.inputTokensEstimate as number) ?? 0,
      outputTokens: Math.ceil(runtime.output.length / 4),
      warnings: runtime.warnings,
      confidence: runtime.confidence,
    };
  }

  const gateway = await completeAITask({
    task: params.task,
    system: params.system,
    user: params.user,
  });

  return {
    output: gateway.output,
    provider: gateway.provider,
    model: gateway.model,
    fallbackUsed: gateway.fallbackUsed,
    costEstimate: gateway.costEstimate,
    inputTokens: Math.ceil((params.system.length + params.user.length) / 4),
    outputTokens: Math.ceil(gateway.output.length / 4),
    warnings: gateway.warnings,
    confidence: gateway.fallbackUsed ? 0.65 : 0.85,
  };
}
