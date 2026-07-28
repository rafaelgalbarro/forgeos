/**
 * PROGRAM 6070 — Migration registry (seeded with real ForgeOS components).
 * Status ladder is evidence-driven; no mass rewrite.
 */

import type { MigrationComponentId, MigrationRegistryEntry, MigrationStatus } from "./types";

function rb(
  trigger: string,
  scope: string,
  dataImpact: string,
  rollbackCommand: string,
  validation: string,
  limitations: string,
) {
  return { trigger, scope, dataImpact, rollbackCommand, validation, limitations };
}

/**
 * Seeded registry — 10 strangler components (flows A–J).
 * Adapter-ready subset: mission.reads, decisions, outputs, builds.
 * Documented stubs: remaining flows.
 */
export const MIGRATION_REGISTRY: MigrationRegistryEntry[] = [
  {
    component: "mission.reads",
    flow: "A_MISSION_READS",
    label: "Mission reads",
    currentContract: "lib/mission-control/mission-persistence.ts + mission-repository.ts (getMissionById, readAllMissions)",
    v2Contract: "src/core/domain/mission.ts + mission/repository.ts (Mission aggregate)",
    adapter: "src/core/migration/adapters/mission-reads.ts",
    status: "DUAL_READ",
    consumers: [
      "components/mission-control/MissionControlShell.tsx",
      "components/lab/LiveMissionLab.tsx",
      "lib/mission-control/index.ts",
    ],
    rollback: rb(
      "ENABLE_V2_QUERIES=false or rising mission.reads fallbacks",
      "mission read path only",
      "none — dual-read does not mutate",
      "npx tsx scripts/rollback-v2.ts --component mission.reads",
      "getMissionById matches localStorage sample; smoke /mission-control",
      "Does not restore deleted V2 rows; V2 store is additive",
    ),
    owner: "mission-control",
    evidence: [
      "adapters/mission-reads.ts DualReadService wiring",
      "tests/migration/migration-6070.test.ts dual read cases",
    ],
  },
  {
    component: "mission.commands",
    flow: "B_MISSION_COMMANDS",
    label: "Mission commands",
    currentContract: "lib/mission-control/mission-flow.ts + conversation-engine.ts + mission-runner.ts",
    v2Contract: "src/core/application/commands.ts (StartMission, ApprovePlan, PauseMission, …)",
    adapter: "src/core/migration/adapters/mission-commands.ts",
    status: "ADAPTER_READY",
    consumers: [
      "components/mission-control/*",
      "lib/mission-control/conversation-engine.ts",
      "lib/mission-control/auto-pilot.ts",
    ],
    rollback: rb(
      "ENABLE_V2_COMMANDS=false",
      "command dispatch",
      "commands issued only to legacy when flag off",
      "npx tsx scripts/rollback-v2.ts --component mission.commands",
      "createNewMission / advancePhase still work with flags off",
      "In-flight V2-only commands may need manual reconcile",
    ),
    owner: "mission-control",
    evidence: ["adapters/mission-commands.ts", "feature-flags ENABLE_V2_COMMANDS"],
    notes: "Strangler: map StartMission → createNewMission; dual-write gated.",
  },
  {
    component: "decisions",
    flow: "C_DECISIONS",
    label: "Decisions",
    currentContract: "lib/mission-control/decision-center.ts (createDecision, resolveDecision)",
    v2Contract: "src/core/domain/decision.ts + decision/entity.ts",
    adapter: "src/core/migration/adapters/decisions.ts",
    status: "DUAL_WRITE",
    consumers: [
      "components/mission-control/DecisionCenterPanel.tsx",
      "lib/mission-control/conversation-engine.ts",
      "lib/mission-control/auto-pilot.ts",
    ],
    rollback: rb(
      "ENABLE_V2_COMMANDS=false + decision divergence spike",
      "decision create/resolve",
      "legacy decision log remains source of truth when flags off",
      "npx tsx scripts/rollback-v2.ts --component decisions",
      "decision log append-only parity for sample mission",
      "Repair copies V2 → legacy; does not delete orphan V2 decisions",
    ),
    owner: "mission-control",
    evidence: ["adapters/decisions.ts", "dual-write retirement 2026-10-01"],
  },
  {
    component: "artifacts",
    flow: "D_ARTIFACTS",
    label: "Artifacts",
    currentContract: "lib/mission-control/types.ts MissionArtifact + mission-session attachArtifact",
    v2Contract: "src/core/domain/artifact/entity.ts",
    adapter: "src/core/migration/adapters/artifacts.ts",
    status: "ADAPTER_READY",
    consumers: ["lib/mission-control/mission-session.ts", "components/mission-control/*"],
    rollback: rb(
      "Flag off / adapter disable",
      "artifact attach path",
      "session artifacts stay in legacy mission payload",
      "npx tsx scripts/rollback-v2.ts --component artifacts",
      "attachArtifact still persists on mission",
      "Build-registry OFFICIAL_ARTIFACTS catalog is out of scope for this row",
    ),
    owner: "mission-control",
    evidence: ["adapters/artifacts.ts stub-documented mapping"],
  },
  {
    component: "outputs",
    flow: "E_OUTPUTS",
    label: "Outputs",
    currentContract: "lib/creation-output/* + lib/multi-output/*",
    v2Contract: "src/core/domain/output.ts + output/entity.ts",
    adapter: "src/core/migration/adapters/outputs.ts",
    status: "DUAL_READ",
    consumers: [
      "app/studio/[missionId]/page.tsx",
      "lib/creation-output/index.ts",
      "lib/multi-output/index.ts",
    ],
    rollback: rb(
      "ENABLE_V2_QUERIES=false / ENABLE_V2_STUDIO=false",
      "studio output reads",
      "none for read path",
      "npx tsx scripts/rollback-v2.ts --component outputs",
      "buildStudioSnapshot / getLatestOutputByType smoke",
      "Does not roll back generation jobs already queued",
    ),
    owner: "creation-output",
    evidence: ["adapters/outputs.ts", "tests dual-read outputs"],
  },
  {
    component: "codebases",
    flow: "F_CODEBASES",
    label: "Codebases",
    currentContract: "lib/code-generation/* (CodeProject, code-repository)",
    v2Contract: "src/core/domain/codebase.ts + codebase/entity.ts",
    adapter: "src/core/migration/adapters/codebases.ts",
    status: "ADAPTER_READY",
    consumers: ["app/studio/[missionId]/code/page.tsx", "app/api/code-generation/**"],
    rollback: rb(
      "ENABLE_V2_STUDIO=false",
      "code generation reads/writes",
      "CodeProject store unchanged when flag off",
      "npx tsx scripts/rollback-v2.ts --component codebases",
      "loadCodeProjectsForMission returns legacy projects",
      "Zip exports remain legacy-path until V2_PRIMARY",
    ),
    owner: "code-generation",
    evidence: ["adapters/codebases.ts documented stub"],
  },
  {
    component: "builds",
    flow: "G_BUILDS",
    label: "Builds",
    currentContract: "lib/build-pipeline/* (getBuildPipelineSnapshot, executeBuildPipeline)",
    v2Contract: "src/core/domain/lifecycle.ts + build/entity.ts",
    adapter: "src/core/migration/adapters/builds.ts",
    status: "ADAPTER_READY",
    consumers: ["app/api/build-pipeline/**", "lib/mission-control/adapters/build-phase-adapter.ts"],
    rollback: rb(
      "ENABLE_V2_ORCHESTRATION=false",
      "build snapshot / dry-run",
      "pipeline state stays on legacy store",
      "npx tsx scripts/rollback-v2.ts --component builds",
      "runBuildPipelineDryRun succeeds",
      "Live cloud builds not auto-cancelled",
    ),
    owner: "build-pipeline",
    evidence: ["adapters/builds.ts"],
  },
  {
    component: "previews",
    flow: "H_PREVIEWS",
    label: "Previews",
    currentContract: "lib/preview-runtime/*",
    v2Contract: "src/core/domain/lifecycle.ts createPreview + preview/entity.ts",
    adapter: "src/core/migration/adapters/previews.ts",
    status: "NOT_STARTED",
    consumers: ["components/preview-runtime/*", "app/studio/**/preview/**"],
    rollback: rb(
      "N/A until ADAPTER_READY",
      "preview runtime",
      "none",
      "npx tsx scripts/rollback-v2.ts --component previews",
      "verify-preview-runtime.js",
      "Stub only — do not enable V2 preview reads",
    ),
    owner: "preview-runtime",
    evidence: ["adapters/previews.ts stub"],
    notes: "Documented stub — wire DualRead after preview entity repository lands.",
  },
  {
    component: "deployments",
    flow: "I_DEPLOYMENTS",
    label: "Deployments",
    currentContract: "lib/preview-deployment/* + lib/build-platform/release-manager",
    v2Contract: "src/core/domain/lifecycle.ts Deployment/Release + deployment/entity.ts",
    adapter: "src/core/migration/adapters/deployments.ts",
    status: "NOT_STARTED",
    consumers: ["app/api/preview-deployment/**"],
    rollback: rb(
      "N/A until ADAPTER_READY",
      "preview deployment orchestrator",
      "none",
      "npx tsx scripts/rollback-v2.ts --component deployments",
      "ENABLE_PREVIEW_DEPLOYMENT=false still safe",
      "Stub — never dual-write production deploys",
    ),
    owner: "preview-deployment",
    evidence: ["adapters/deployments.ts stub"],
  },
  {
    component: "company.overview",
    flow: "J_COMPANY_OVERVIEW",
    label: "Company overview",
    currentContract: "lib/mission-control/autonomous-company/*",
    v2Contract: "ENABLE_V2_COMPANY_OS — Workspace/Venture only until Company OS aggregate exists",
    adapter: "src/core/migration/adapters/company-overview.ts",
    status: "NOT_STARTED",
    consumers: ["components/mission-control/company/CompanyWorkspacesPanel.tsx"],
    rollback: rb(
      "ENABLE_V2_COMPANY_OS=false (default)",
      "company workspaces UI",
      "none",
      "npx tsx scripts/rollback-v2.ts --component company.overview",
      "buildCompanyWorkspacesSnapshot still works",
      "No V2 Company OS contract yet — keep NOT_STARTED",
    ),
    owner: "autonomous-company",
    evidence: ["adapters/company-overview.ts stub"],
    notes: "Blocked on Programs 6050/6060 Company OS surface.",
  },
];

export function getRegistryEntry(component: MigrationComponentId): MigrationRegistryEntry | undefined {
  return MIGRATION_REGISTRY.find((e) => e.component === component);
}

export function listRegistryByStatus(status: MigrationStatus): MigrationRegistryEntry[] {
  return MIGRATION_REGISTRY.filter((e) => e.status === status);
}

export function registryProgress(): {
  total: number;
  byStatus: Record<MigrationStatus, number>;
  percentPastNotStarted: number;
} {
  const byStatus = {
    NOT_STARTED: 0,
    ADAPTER_READY: 0,
    DUAL_READ: 0,
    DUAL_WRITE: 0,
    V2_PRIMARY: 0,
    LEGACY_READ_ONLY: 0,
    DEPRECATED: 0,
    REMOVED: 0,
  } as Record<MigrationStatus, number>;
  for (const e of MIGRATION_REGISTRY) byStatus[e.status] += 1;
  const past = MIGRATION_REGISTRY.filter((e) => e.status !== "NOT_STARTED").length;
  return {
    total: MIGRATION_REGISTRY.length,
    byStatus,
    percentPastNotStarted: Math.round((past / MIGRATION_REGISTRY.length) * 100),
  };
}

export function nextComponentsToMigrate(limit = 3): MigrationRegistryEntry[] {
  const order: MigrationStatus[] = ["NOT_STARTED", "ADAPTER_READY", "DUAL_READ", "DUAL_WRITE"];
  const out: MigrationRegistryEntry[] = [];
  for (const status of order) {
    for (const e of MIGRATION_REGISTRY) {
      if (e.status === status) out.push(e);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

export const REGISTRY_SEED_COUNT = MIGRATION_REGISTRY.length;
