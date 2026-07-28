import { NextResponse } from "next/server";
import { runAIRuntime } from "@/lib/ai-runtime";
import { mergeWorkspaceIntoAiContext } from "@/lib/auth/ai-context-bridge";
import type { AITask } from "@/lib/ai-gateway/types";
import type { OptimizerMode, RuntimeProviderId } from "@/lib/ai-runtime/types";

const VALID_TASKS: AITask[] = [
  "research",
  "product",
  "ceo",
  "board",
  "strategy",
  "build-plan",
  "legal",
  "marketing",
  "code",
  "classification",
];

const VALID_OPTIMIZERS: OptimizerMode[] = ["cost", "latency", "quality", "balanced"];

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { task, input, context, provider, optimizer, ventureId, workspaceId, workspaceContext } = body as {
    task?: string;
    input?: string;
    context?: { system?: string; metadata?: Record<string, unknown> };
    provider?: string;
    optimizer?: string;
    ventureId?: string;
    workspaceId?: string;
    workspaceContext?: {
      workspaceId?: string;
      workspaceName?: string;
      organizationId?: string;
      organizationName?: string;
      userId?: string;
      ventureIds?: string[];
    };
  };

  if (!task || !VALID_TASKS.includes(task as AITask)) {
    return NextResponse.json({ error: "Valid task is required" }, { status: 400 });
  }
  if (!input?.trim()) {
    return NextResponse.json({ error: "input is required" }, { status: 400 });
  }
  if (optimizer && !VALID_OPTIMIZERS.includes(optimizer as OptimizerMode)) {
    return NextResponse.json({ error: "Invalid optimizer" }, { status: 400 });
  }

  try {
    const baseContext = ventureId
      ? { ventureId, sources: ["memory", "knowledge", "decision-graph"] as const, metadata: context?.metadata }
      : context?.metadata
        ? { metadata: context.metadata }
        : undefined;

    const mergedContext = mergeWorkspaceIntoAiContext(
      baseContext as import("@/lib/ai-runtime/context-engine/v2").ContextV2Input | undefined,
      workspaceContext ?? (workspaceId ? { workspaceId } : null)
    );

    const result = await runAIRuntime({
      task: task as AITask,
      userInput: input.trim(),
      systemPrompt: context?.system,
      providerOverride: provider as import("@/lib/ai-runtime/types").RuntimeProviderId | undefined,
      optimizer: (optimizer as import("@/lib/ai-runtime/types").OptimizerMode) ?? "balanced",
      context: mergedContext,
    });

    return NextResponse.json({
      output: result.output,
      provider: result.provider,
      model: result.model,
      fallbackUsed: result.fallbackUsed,
      costEstimate: result.costEstimate,
      warnings: result.warnings,
      metadata: {
        ...result.metadata,
        routing: result.routing,
        telemetryId: result.telemetryId,
        confidence: result.confidence,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI Runtime error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
