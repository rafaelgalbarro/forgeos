/** ForgeOS Live AI — RC6 live mode state & telemetry. */

import { isRealAiEnabled } from "@/lib/ai-runtime/config";
import { getExtendedTelemetry, getTelemetrySummary } from "@/lib/ai-runtime/telemetry/v2";
import { getAIRuntimeTelemetry } from "@/lib/ai-runtime/telemetry";
import { listProviderAdapters } from "@/lib/ai-runtime/providers/provider-factory";
import { buildModelRegistrySnapshot } from "@/lib/ai-runtime/model-registry";
import { getActiveStreamSessions } from "@/lib/ai-runtime/streaming";
import { MESH_DEPARTMENTS } from "@/lib/executive-mesh/departments";
import type { MeshDepartmentId } from "@/lib/executive-mesh/types";

export interface LiveDepartmentStatus {
  id: MeshDepartmentId;
  label: string;
  status: "idle" | "thinking" | "working" | "done";
  model?: string;
  provider?: string;
  cost?: number;
  latencyMs?: number;
  confidence?: number;
  capability?: string;
  skill?: string;
  resultPreview?: string;
}

export interface LiveAiSnapshot {
  realAiEnabled: boolean;
  streamingEnabled: boolean;
  ceoThinking: boolean;
  departments: LiveDepartmentStatus[];
  telemetry: ReturnType<typeof getTelemetrySummary>;
  recentRequests: ReturnType<typeof getAIRuntimeTelemetry>;
  providers: { id: string; label: string; configured: boolean }[];
  modelCount: number;
  activeStreams: number;
}

export function buildLiveAiSnapshot(): LiveAiSnapshot {
  const realAi = isRealAiEnabled();
  const telemetry = realAi ? getTelemetrySummary() : { requestCount: 0, totalCost: 0, totalTokens: 0, fallbacks: 0, errors: 0, avgLatencyMs: 0, cacheHits: 0 };
  const recent = getAIRuntimeTelemetry().slice(0, 10);
  const registry = buildModelRegistrySnapshot();
  const providers = listProviderAdapters().map((p) => ({
    id: p.id,
    label: p.label,
    configured: p.isConfigured(),
  }));

  const departments: LiveDepartmentStatus[] = MESH_DEPARTMENTS.slice(0, 16).map((d, i) => {
    const recentForDept = getExtendedTelemetry().find((t) => t.department === d.id);
    return {
      id: d.id,
      label: d.label,
      status: recentForDept ? "done" : i === 0 && realAi ? "thinking" : "idle",
      model: recentForDept?.model,
      provider: recentForDept?.provider,
      cost: recentForDept?.costEstimate,
      latencyMs: recentForDept?.latencyMs,
      confidence: recentForDept?.confidence,
      capability: recentForDept?.capability,
      skill: recentForDept?.skill,
      resultPreview: recentForDept ? `${d.label} — última ejecución` : undefined,
    };
  });

  return {
    realAiEnabled: realAi,
    streamingEnabled: true,
    ceoThinking: departments.find((d) => d.id === "ceo")?.status === "thinking",
    departments,
    telemetry,
    recentRequests: recent,
    providers,
    modelCount: registry.totalCount,
    activeStreams: getActiveStreamSessions().length,
  };
}
