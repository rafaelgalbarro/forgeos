/** PROGRAM 5390 — Multi-output plan builder. */

import type { MissionSession } from "@/lib/mission-control/types";
import type {
  MultiOutputPlan,
  MultiOutputStageItem,
  PlannedOutput,
  MultiOutputKind,
} from "./types";
import {
  OUTPUT_KIND_LABELS,
  OUTPUT_KIND_ICONS,
  KIND_TO_CREATION_OUTPUT,
  ALL_OUTPUT_KINDS,
} from "./types";
import { selectOutputsByIntent } from "./output-selector";
import { getDependenciesFor, topologicalSort } from "./output-dependency-graph";

const ESTIMATED_MINUTES: Partial<Record<MultiOutputKind, number>> = {
  VENTURE: 15,
  BRAND: 20,
  WEBSITE: 30,
  WEB_APP: 45,
  MOBILE: 40,
  BACKEND: 35,
  DATABASE: 15,
  API: 20,
  DEPLOYMENT: 10,
  GTM: 25,
  INVESTOR: 20,
  OPERATIONAL: 15,
};

const ESTIMATED_COST: Partial<Record<MultiOutputKind, number>> = {
  VENTURE: 0,
  BRAND: 200,
  WEBSITE: 500,
  WEB_APP: 1200,
  MOBILE: 800,
  BACKEND: 600,
  DATABASE: 300,
  API: 200,
  DEPLOYMENT: 100,
  GTM: 400,
  INVESTOR: 300,
  OPERATIONAL: 200,
};

function generatePlanId(): string {
  return `mop-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function buildStages(): MultiOutputStageItem[] {
  const stages: MultiOutputStageItem[] = [
    { stage: "UNDERSTAND", label: "Entender", dependencies: [], status: "pending" },
    { stage: "SELECT_OUTPUTS", label: "Seleccionar outputs", dependencies: ["UNDERSTAND"], status: "pending" },
    { stage: "BUILD_SHARED_CONTEXT", label: "Contexto compartido", dependencies: ["SELECT_OUTPUTS"], status: "pending" },
    { stage: "GENERATE_SHARED_ASSETS", label: "Assets compartidos", dependencies: ["BUILD_SHARED_CONTEXT"], status: "pending" },
    { stage: "GENERATE_OUTPUTS", label: "Generar outputs", dependencies: ["GENERATE_SHARED_ASSETS"], status: "pending" },
    { stage: "VALIDATE", label: "Validar", dependencies: ["GENERATE_OUTPUTS"], status: "pending" },
    { stage: "PREVIEW", label: "Preview", dependencies: ["VALIDATE"], status: "pending" },
    { stage: "APPROVE", label: "Aprobar", dependencies: ["PREVIEW"], status: "pending" },
    { stage: "DEPLOY_PREVIEW", label: "Deploy preview", dependencies: ["APPROVE"], status: "pending" },
    { stage: "OPERATE", label: "Operar", dependencies: ["DEPLOY_PREVIEW"], status: "pending" },
    { stage: "EVOLVE", label: "Evolucionar", dependencies: ["OPERATE"], status: "pending" },
  ];
  return stages;
}

function buildPlannedOutput(
  kind: MultiOutputKind,
  requirement: PlannedOutput["requirement"] extends never ? never : "required" | "optional" | "excluded"
): PlannedOutput {
  const deps = getDependenciesFor(kind);
  return {
    kind,
    label: OUTPUT_KIND_LABELS[kind],
    icon: OUTPUT_KIND_ICONS[kind],
    requirement,
    status: requirement === "excluded" ? "excluido" : "planificado",
    version: "0.1.0",
    dependencies: deps,
    creationOutputType: KIND_TO_CREATION_OUTPUT[kind],
    estimatedMinutes: ESTIMATED_MINUTES[kind] ?? 15,
    estimatedCostEur: ESTIMATED_COST[kind] ?? 0,
    health: requirement === "excluded" ? "pending" : "pending",
    warnings: [],
    pendingChanges: [],
  };
}

export function createMultiOutputPlan(session: MissionSession): MultiOutputPlan {
  const idea = session.intent?.extractedIdea ?? "Misión ForgeOS";
  const primary = session.intent?.primary ?? null;
  const secondary = session.intent?.secondary ?? [];

  const selection = selectOutputsByIntent(idea, primary, secondary);
  const now = new Date().toISOString();

  const outputs: PlannedOutput[] = ALL_OUTPUT_KINDS.map((kind) => {
    const sel = selection.selections.find((s) => s.kind === kind);
    const requirement = sel?.requirement ?? "excluded";
    return buildPlannedOutput(kind, requirement);
  });

  const activeOutputs = outputs.filter((o) => o.requirement !== "excluded");
  const genOrder = topologicalSort(activeOutputs.map((o) => o.kind));

  // Mark parallel-safe pairs
  for (const output of activeOutputs) {
    output.parallelWith = genOrder.filter(
      (k) => k !== output.kind && canParallelWith(output.kind, k, genOrder)
    );
  }

  const estimatedMinutes = activeOutputs.reduce((sum, o) => sum + o.estimatedMinutes, 0);
  const estimatedCostEur = activeOutputs.reduce((sum, o) => sum + o.estimatedCostEur, 0);
  const monorepoRecommended = activeOutputs.length >= 6;

  return {
    planId: generatePlanId(),
    missionId: session.missionId,
    status: "PENDING_ACCEPTANCE",
    intentProfile: selection.profile,
    outputs,
    stages: buildStages(),
    estimatedMinutes,
    estimatedCostEur,
    excludedReasons: selection.excluded,
    monorepoRecommended,
    monorepoStructure: monorepoRecommended
      ? ["apps/website", "apps/web", "apps/mobile", "apps/api", "packages/ui", "packages/contracts", "packages/config", "packages/types", "packages/analytics"]
      : undefined,
    explanation: selection.explanation,
    createdAt: now,
    updatedAt: now,
  };
}

function canParallelWith(kind: MultiOutputKind, other: MultiOutputKind, order: MultiOutputKind[]): boolean {
  const kindIdx = order.indexOf(kind);
  const otherIdx = order.indexOf(other);
  if (kindIdx < 0 || otherIdx < 0) return false;
  // Same level in topo order = potentially parallel
  return Math.abs(kindIdx - otherIdx) <= 1;
}

export function acceptPlan(plan: MultiOutputPlan): MultiOutputPlan {
  const now = new Date().toISOString();
  return {
    ...plan,
    status: "ACCEPTED",
    acceptedAt: now,
    updatedAt: now,
    stages: plan.stages.map((s) =>
      s.stage === "SELECT_OUTPUTS" ? { ...s, status: "completed" as const } : s
    ),
  };
}

export function modifyPlanOutputs(
  plan: MultiOutputPlan,
  changes: Partial<Record<MultiOutputKind, "required" | "optional" | "excluded">>
): MultiOutputPlan {
  const now = new Date().toISOString();
  const outputs = plan.outputs.map((o) => {
    const newReq = changes[o.kind];
    if (!newReq) return o;
    return {
      ...o,
      requirement: newReq,
      status: newReq === "excluded" ? ("excluido" as const) : ("planificado" as const),
    };
  });

  const active = outputs.filter((o) => o.requirement !== "excluded");
  return {
    ...plan,
    status: "MODIFIED",
    outputs,
    modifiedAt: now,
    updatedAt: now,
    estimatedMinutes: active.reduce((s, o) => s + o.estimatedMinutes, 0),
    estimatedCostEur: active.reduce((s, o) => s + o.estimatedCostEur, 0),
  };
}

const planStore = new Map<string, MultiOutputPlan>();

export function getMultiOutputPlan(missionId: string): MultiOutputPlan | null {
  return planStore.get(missionId) ?? null;
}

export function saveMultiOutputPlan(plan: MultiOutputPlan): MultiOutputPlan {
  planStore.set(plan.missionId, plan);
  return plan;
}

export function getActiveOutputKinds(plan: MultiOutputPlan): MultiOutputKind[] {
  return plan.outputs
    .filter((o) => o.requirement !== "excluded")
    .map((o) => o.kind);
}

export function getCreationOutputTypesFromPlan(plan: MultiOutputPlan): import("@/lib/creation-output/types").CreationOutputType[] {
  const types = plan.outputs
    .filter((o) => o.requirement !== "excluded" && o.creationOutputType)
    .map((o) => o.creationOutputType!);
  if (types.length > 0) return types;
  return [
    "VENTURE_OUTPUT",
    "WEBSITE_OUTPUT",
    "WEB_APPLICATION_OUTPUT",
    "MOBILE_APPLICATION_OUTPUT",
    "BACKEND_OUTPUT",
    "DEPLOYMENT_OUTPUT",
  ];
}
