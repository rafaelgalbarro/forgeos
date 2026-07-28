/** Executive Mesh — AI Runtime adapter (RC6). */

import { isRealAiEnabled } from "@/lib/ai-runtime/config";
import { completeViaAIRuntime } from "@/lib/ai-runtime/pipeline";
import type { AITask } from "@/lib/ai-gateway/types";
import type { MeshDepartmentId } from "../types";

const DEPARTMENT_TASK_MAP: Partial<Record<MeshDepartmentId, AITask>> = {
  ceo: "ceo-brief",
  cto: "build-architecture",
  cpo: "product",
  cmo: "marketing",
  cfo: "strategy",
  research: "research",
  product: "product",
  ux: "product",
  architecture: "build-architecture",
  backend: "code",
  frontend: "code",
  qa: "classification",
  security: "legal",
  legal: "legal",
  growth: "marketing",
  capital: "strategy",
  support: "classification",
};

export interface DepartmentAiResult {
  department: MeshDepartmentId;
  output: string;
  provider: string;
  model: string;
  costEstimate: number;
  latencyMs: number;
  confidence: number;
  mockUsed: boolean;
}

export async function meshRunDepartmentAi(params: {
  department: MeshDepartmentId;
  prompt: string;
  ventureId?: string;
  systemPrompt?: string;
}): Promise<DepartmentAiResult> {
  const task = DEPARTMENT_TASK_MAP[params.department] ?? "classification";
  const started = Date.now();

  if (!isRealAiEnabled()) {
    return {
      department: params.department,
      output: `[${params.department.toUpperCase()}] Análisis simulado: ${params.prompt.slice(0, 120)}…`,
      provider: "mock",
      model: "mock",
      costEstimate: 0,
      latencyMs: Date.now() - started,
      confidence: 0.7,
      mockUsed: true,
    };
  }

  const runtime = await completeViaAIRuntime({
    task,
    system: params.systemPrompt ?? `You are the ${params.department} department of ForgeOS Executive Mesh.`,
    user: params.prompt,
    ventureId: params.ventureId,
    context: {
      ventureId: params.ventureId,
      sources: ["memory", "knowledge", "decision-graph", "timeline"],
      metadata: { department: params.department },
    },
  });

  return {
    department: params.department,
    output: runtime.output,
    provider: runtime.provider,
    model: runtime.model,
    costEstimate: runtime.costEstimate,
    latencyMs: runtime.latencyMs,
    confidence: runtime.confidence,
    mockUsed: runtime.fallbackUsed,
  };
}

export async function meshRunCeoThinking(params: {
  prompt: string;
  ventureId?: string;
}): Promise<DepartmentAiResult> {
  return meshRunDepartmentAi({
    department: "ceo",
    prompt: params.prompt,
    ventureId: params.ventureId,
    systemPrompt: "You are the CEO AI of ForgeOS. Think strategically. Output executive summary only.",
  });
}
