/** PROGRAM 5390 — Output status tracking. */

import type {
  MultiOutputKind,
  MultiOutputPlan,
  PlannedOutput,
  PlannedOutputStatus,
  MultiOutputSummary,
  PlannedOutputSummary,
} from "./types";
import { OUTPUT_KIND_LABELS, OUTPUT_KIND_ICONS } from "./types";
import type { CreationOutput, CreationOutputStatus } from "@/lib/creation-output/types";

const STATUS_MAP: Partial<Record<CreationOutputStatus, PlannedOutputStatus>> = {
  DRAFT: "planificado",
  GENERATING: "generando",
  PREVIEW_READY: "preview",
  VALIDATING: "generando",
  CHANGES_REQUESTED: "bloqueado",
  APPROVED: "aprobado",
  EXPORT_READY: "aprobado",
  DEPLOYMENT_READY: "desplegado",
  FAILED: "fallido",
};

export function mapCreationStatusToPlanned(status: CreationOutputStatus): PlannedOutputStatus {
  return STATUS_MAP[status] ?? "planificado";
}

export function updateOutputStatus(
  plan: MultiOutputPlan,
  kind: MultiOutputKind,
  status: PlannedOutputStatus,
  extras?: Partial<PlannedOutput>
): MultiOutputPlan {
  const now = new Date().toISOString();
  return {
    ...plan,
    updatedAt: now,
    outputs: plan.outputs.map((o) =>
      o.kind === kind ? { ...o, status, ...extras, version: extras?.version ?? o.version } : o
    ),
  };
}

export function syncPlanFromCreationOutputs(
  plan: MultiOutputPlan,
  creationOutputs: CreationOutput[]
): MultiOutputPlan {
  let updated = plan;
  for (const output of creationOutputs) {
    const planned = updated.outputs.find(
      (o) => o.creationOutputType === output.type && o.requirement !== "excluded"
    );
    if (!planned) continue;
    updated = updateOutputStatus(updated, planned.kind, mapCreationStatusToPlanned(output.status), {
      version: output.version,
      previewUrl: output.previewUrl,
      health: output.validation?.passed === false ? "error" : output.warnings.length > 0 ? "warning" : "healthy",
      warnings: output.warnings.map((w) => w.message),
    });
  }
  return updated;
}

export function markOutputBlocked(
  plan: MultiOutputPlan,
  kind: MultiOutputKind,
  reason: string,
  repairPlan?: string[]
): MultiOutputPlan {
  return updateOutputStatus(plan, kind, "bloqueado", {
    blockedReason: reason,
    repairPlan,
    health: "error",
  });
}

export function markOutputFailed(
  plan: MultiOutputPlan,
  kind: MultiOutputKind,
  error: string,
  repairPlan: string[]
): MultiOutputPlan {
  return updateOutputStatus(plan, kind, "fallido", {
    blockedReason: error,
    repairPlan,
    health: "error",
  });
}

export function buildMultiOutputSummary(plan: MultiOutputPlan): MultiOutputSummary {
  const active = plan.outputs.filter((o) => o.requirement !== "excluded");
  const outputs: PlannedOutputSummary[] = active.map((o) => ({
    kind: o.kind,
    label: o.label,
    icon: o.icon,
    status: o.status,
    version: o.version,
    health: o.health,
    studioHref: `/studio/${plan.missionId}?type=${o.creationOutputType ?? o.kind}`,
  }));

  const readyCount = active.filter(
    (o) => o.status === "preview" || o.status === "aprobado" || o.status === "desplegado"
  ).length;
  const blockedCount = active.filter((o) => o.status === "bloqueado" || o.status === "fallido").length;

  return {
    missionId: plan.missionId,
    planStatus: plan.status,
    releaseVersion: "0.1.0",
    outputs,
    totalOutputs: active.length,
    readyCount,
    blockedCount,
    lastUpdated: plan.updatedAt,
  };
}

export function getOutputsByStatus(
  plan: MultiOutputPlan,
  status: PlannedOutputStatus
): PlannedOutput[] {
  return plan.outputs.filter((o) => o.status === status && o.requirement !== "excluded");
}

export function countByStatus(plan: MultiOutputPlan): Record<PlannedOutputStatus, number> {
  const counts: Record<string, number> = {};
  for (const o of plan.outputs) {
    if (o.requirement === "excluded") continue;
    counts[o.status] = (counts[o.status] ?? 0) + 1;
  }
  return counts as Record<PlannedOutputStatus, number>;
}

export function isPlanReadyForGeneration(plan: MultiOutputPlan): boolean {
  return plan.status === "ACCEPTED" || plan.status === "MODIFIED" || plan.status === "EXECUTING";
}

export function isPlanComplete(plan: MultiOutputPlan): boolean {
  const active = plan.outputs.filter((o) => o.requirement !== "excluded");
  return active.every(
    (o) => o.status === "aprobado" || o.status === "desplegado" || o.status === "preview"
  );
}
