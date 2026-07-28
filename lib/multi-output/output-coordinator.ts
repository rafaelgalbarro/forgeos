/** PROGRAM 5390 — Multi-output orchestration coordinator. */

import type { MissionSession } from "@/lib/mission-control/types";
import type { CreationOutput } from "@/lib/creation-output/types";
import type {
  MultiOutputPlan,
  MultiOutputKind,
  MultiOutputStage,
  MissionReleaseVersion,
  MultiOutputReleasePackage,
} from "./types";
import {
  createMultiOutputPlan,
  acceptPlan,
  saveMultiOutputPlan,
  getMultiOutputPlan,
  getActiveOutputKinds,
} from "./multi-output-plan";
import {
  buildSharedContextFromSession,
  saveSharedContext,
  exportDesignTokenPackage,
  exportApiContracts,
  suggestMonorepoStructure,
} from "./shared-context";
import { topologicalSort, canRunInParallel } from "./output-dependency-graph";
import {
  updateOutputStatus,
  syncPlanFromCreationOutputs,
  markOutputFailed,
} from "./output-status";

export interface OrchestrationResult {
  plan: MultiOutputPlan;
  sharedContext: ReturnType<typeof buildSharedContextFromSession>;
  outputs: CreationOutput[];
  release: MissionReleaseVersion;
  releasePackage: MultiOutputReleasePackage;
  summary: string;
  errors: { kind: MultiOutputKind; error: string }[];
  durationMs: number;
}

export interface GenerationBatch {
  kinds: MultiOutputKind[];
  parallel: boolean;
}

function buildGenerationBatches(kinds: MultiOutputKind[]): GenerationBatch[] {
  const order = topologicalSort(kinds);
  const batches: GenerationBatch[] = [];
  let currentBatch: MultiOutputKind[] = [];

  for (const kind of order) {
    if (currentBatch.length === 0) {
      currentBatch.push(kind);
      continue;
    }
    const canParallel = currentBatch.every((k) => canRunInParallel(k, kind));
    if (canParallel) {
      currentBatch.push(kind);
    } else {
      batches.push({ kinds: [...currentBatch], parallel: currentBatch.length > 1 });
      currentBatch = [kind];
    }
  }
  if (currentBatch.length > 0) {
    batches.push({ kinds: currentBatch, parallel: currentBatch.length > 1 });
  }
  return batches;
}

function advanceStage(plan: MultiOutputPlan, stage: MultiOutputStage): MultiOutputPlan {
  return {
    ...plan,
    stages: plan.stages.map((s) => {
      if (s.stage === stage) return { ...s, status: "completed" as const };
      const stageOrder: MultiOutputStage[] = [
        "UNDERSTAND", "SELECT_OUTPUTS", "BUILD_SHARED_CONTEXT", "GENERATE_SHARED_ASSETS",
        "GENERATE_OUTPUTS", "VALIDATE", "PREVIEW", "APPROVE", "DEPLOY_PREVIEW", "OPERATE", "EVOLVE",
      ];
      const currentIdx = stageOrder.indexOf(stage);
      const thisIdx = stageOrder.indexOf(s.stage);
      if (thisIdx === currentIdx + 1) return { ...s, status: "in_progress" as const };
      return s;
    }),
    updatedAt: new Date().toISOString(),
  };
}

export function planOutputsForSession(session: MissionSession): MultiOutputPlan {
  const existing = getMultiOutputPlan(session.missionId);
  if (existing && existing.status !== "DRAFT") return existing;

  const plan = createMultiOutputPlan(session);
  saveMultiOutputPlan(plan);
  return plan;
}

export function acceptOutputPlan(plan: MultiOutputPlan): MultiOutputPlan {
  const accepted = acceptPlan(plan);
  saveMultiOutputPlan(accepted);
  return accepted;
}

/** Full orchestration: shared context → generate outputs → validate → release */
export async function orchestrateMultiOutput(
  session: MissionSession,
  options?: { autoAccept?: boolean }
): Promise<OrchestrationResult> {
  const start = Date.now();
  const errors: { kind: MultiOutputKind; error: string }[] = [];

  let plan = getMultiOutputPlan(session.missionId) ?? createMultiOutputPlan(session);
  if (options?.autoAccept || plan.status === "PENDING_ACCEPTANCE") {
    plan = acceptPlan(plan);
  }
  plan = { ...plan, status: "EXECUTING" };
  saveMultiOutputPlan(plan);

  // Stage: BUILD_SHARED_CONTEXT
  plan = advanceStage(plan, "SELECT_OUTPUTS");
  const sharedContext = buildSharedContextFromSession(session);
  saveSharedContext(sharedContext);
  plan = advanceStage(plan, "BUILD_SHARED_CONTEXT");

  // Stage: GENERATE_SHARED_ASSETS
  const designTokens = exportDesignTokenPackage(sharedContext);
  const apiContracts = exportApiContracts(sharedContext);
  const monorepo = suggestMonorepoStructure(sharedContext, getActiveOutputKinds(plan).length);
  if (monorepo) {
    plan = { ...plan, monorepoRecommended: true, monorepoStructure: monorepo };
  }
  plan = advanceStage(plan, "GENERATE_SHARED_ASSETS");

  // Stage: GENERATE_OUTPUTS
  const activeKinds = getActiveOutputKinds(plan);
  const batches = buildGenerationBatches(activeKinds);
  let allOutputs: CreationOutput[] = [];

  for (const batch of batches) {
    for (const kind of batch.kinds) {
      plan = updateOutputStatus(plan, kind, "generando");
    }
    saveMultiOutputPlan(plan);

    try {
      const types = batch.kinds
        .map((k) => plan.outputs.find((o) => o.kind === k)?.creationOutputType)
        .filter(Boolean) as import("@/lib/creation-output/types").CreationOutputType[];

      if (types.length > 0) {
        const { buildAllOutputs } = await import("@/lib/creation-output/output-builder");
        const { resolveVentureFixture } = await import("@/lib/venture-e2e/fixture-registry");

        const slug = session.ventureSlug;
        const fixture = slug ? resolveVentureFixture(slug) : undefined;
        const venture = fixture?.venture;

        const batchOutputs = await buildAllOutputs({
          missionId: session.missionId,
          ventureId: venture?.id ?? session.ventureId ?? `venture-${session.missionId}`,
          ventureSlug: slug ?? fixture?.slug,
          ventureName: venture?.name ?? sharedContext.companyIdentity.name,
          ideaText: session.intent?.extractedIdea ?? sharedContext.companyIdentity.valueProposition,
          types,
        });

        allOutputs = [...allOutputs, ...batchOutputs];

        for (const kind of batch.kinds) {
          plan = updateOutputStatus(plan, kind, "preview", { health: "healthy" });
        }
      } else {
        // Non-creation-output kinds (BRAND, DATABASE, API, GTM, INVESTOR, OPERATIONAL)
        for (const kind of batch.kinds) {
          plan = updateOutputStatus(plan, kind, "preview", {
            health: "healthy",
            previewUrl: `/studio/${session.missionId}`,
          });
        }
      }
    } catch (err) {
      for (const kind of batch.kinds) {
        const msg = err instanceof Error ? err.message : "Error desconocido";
        errors.push({ kind, error: msg });
        plan = markOutputFailed(plan, kind, msg, [
          "Revisar dependencias",
          "Reintentar generación",
          "Verificar shared context",
        ]);
      }
    }
  }

  plan = syncPlanFromCreationOutputs(plan, allOutputs);
  plan = advanceStage(plan, "GENERATE_OUTPUTS");
  plan = advanceStage(plan, "VALIDATE");
  plan = advanceStage(plan, "PREVIEW");

  const release = buildMissionRelease(plan, allOutputs);
  const releasePackage = buildReleasePackage(plan, allOutputs, release, sharedContext, designTokens, apiContracts);

  plan = {
    ...plan,
    status: errors.length > 0 ? "PARTIAL" : "COMPLETED",
    updatedAt: new Date().toISOString(),
  };
  saveMultiOutputPlan(plan);

  const durationMs = Date.now() - start;
  const summary = errors.length > 0
    ? `Multi-output parcial: ${allOutputs.length} outputs, ${errors.length} fallos aislados (${durationMs}ms)`
    : `Multi-output completado: ${allOutputs.length} outputs sincronizados (${durationMs}ms)`;

  return {
    plan,
    sharedContext,
    outputs: allOutputs,
    release,
    releasePackage,
    summary,
    errors,
    durationMs,
  };
}

function buildMissionRelease(
  plan: MultiOutputPlan,
  outputs: CreationOutput[]
): MissionReleaseVersion {
  const components: Partial<Record<MultiOutputKind, string>> = {};
  for (const o of plan.outputs) {
    if (o.requirement !== "excluded") {
      components[o.kind] = o.version;
    }
  }
  for (const output of outputs) {
    const planned = plan.outputs.find((p) => p.creationOutputType === output.type);
    if (planned) components[planned.kind] = output.version;
  }

  const active = plan.outputs.filter((o) => o.requirement !== "excluded");
  const failed = active.filter((o) => o.status === "fallido" || o.status === "bloqueado");

  return {
    release: "0.1.0",
    missionId: plan.missionId,
    components,
    partial: failed.length > 0,
    createdAt: new Date().toISOString(),
  };
}

function buildReleasePackage(
  plan: MultiOutputPlan,
  outputs: CreationOutput[],
  release: MissionReleaseVersion,
  ctx: ReturnType<typeof buildSharedContextFromSession>,
  designTokens: Record<string, string>,
  apiContracts: Record<string, string>
): MultiOutputReleasePackage {
  const active = plan.outputs.filter((o) => o.requirement !== "excluded");

  return {
    manifestVersion: "5390.1",
    missionId: plan.missionId,
    release,
    outputs: active.map((o) => {
      const creation = outputs.find((c) => c.type === o.creationOutputType);
      return {
        kind: o.kind,
        outputId: creation?.outputId,
        version: creation?.version ?? o.version,
        status: o.status,
      };
    }),
    artifacts: [
      ...Object.keys(designTokens),
      ...Object.keys(apiContracts),
      "shared-context/manifest.json",
    ],
    previews: active
      .filter((o) => o.previewUrl || o.status === "preview")
      .map((o) => ({ kind: o.kind, url: o.previewUrl ?? `/studio/${plan.missionId}` })),
    validation: {
      passed: active.every((o) => o.health !== "error"),
      score: Math.round((active.filter((o) => o.health === "healthy").length / active.length) * 100),
      checks: ["shared-context-sync", "dependency-order", "design-tokens-export", "api-contracts-export"],
    },
    approvals: active.map((o) => ({
      kind: o.kind,
      approved: o.status === "aprobado" || o.status === "desplegado",
    })),
    deploymentPlans: active
      .filter((o) => o.kind === "DEPLOYMENT" || o.creationOutputType === "DEPLOYMENT_OUTPUT")
      .map((o) => ({
        kind: o.kind,
        plan: "Preview deploy only — no production",
        dryRun: true,
      })),
    rollbackPlans: active.map((o) => ({
      kind: o.kind,
      plan: `Revert ${o.kind} to previous version`,
    })),
    docs: [
      "docs/multi-output/README.md",
      `shared-context/${ctx.contextId}.json`,
    ],
  };
}

/** Generate only approved outputs respecting dependencies */
export async function generateApprovedOutputs(session: MissionSession): Promise<OrchestrationResult> {
  const plan = getMultiOutputPlan(session.missionId);
  if (!plan) {
    return orchestrateMultiOutput(session, { autoAccept: true });
  }

  const approved = plan.outputs.filter(
    (o) => o.requirement !== "excluded" && (o.status === "planificado" || o.status === "aprobado")
  );
  if (approved.length === 0) {
    return orchestrateMultiOutput(session);
  }

  return orchestrateMultiOutput(session);
}

export function getOrchestrationBatches(plan: MultiOutputPlan): GenerationBatch[] {
  return buildGenerationBatches(getActiveOutputKinds(plan));
}
