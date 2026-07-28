/** ForgeOS Build Pipeline — main orchestrator (Sprint 5). */

import { getConnectionsHealth } from "@/lib/connections";
import {
  getBuildFlowPolicySummary,
  runBuildFlowDryRun,
  requestBuildFlowApproval,
  executeBuildFlow,
  getExecutionFlagsSnapshot,
} from "@/lib/real-build-flow";
import { getApprovalSession } from "@/lib/real-execution";
import { createLabMockVenture, LAB_MOCK_VENTURE_ID } from "@/lib/lab/mock-venture";
import type { VentureProject } from "@/lib/domain/venture";
import { runPipelineGitHubStep } from "./github-step";
import { runPipelineSupabaseStep } from "./supabase-step";
import { runPipelineVercelStep } from "./vercel-step";
import { generateMigrationPlan } from "./migration-plan";
import { generateRollbackPlan } from "./rollback-plan";
import { generateBuildReport } from "./build-report";
import { assessPipelineRisk } from "./risk-assessment";
import {
  auditPipelineDryRun,
  auditPipelineExecuted,
  getPipelineAuditLog,
} from "./audit-trail";
import type {
  BuildPipelineInput,
  BuildPipelinePolicy,
  BuildPipelineSnapshot,
  DeployPreviewPlan,
  PipelineMode,
  PipelineStage,
  PipelineStageId,
  PipelineTimelineEvent,
  ProjectPlan,
  RepositoryPlan,
} from "./types";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

function resolveVenture(ventureId: string): VentureProject {
  if (ventureId === LAB_MOCK_VENTURE_ID) return createLabMockVenture();
  return {
    ...createLabMockVenture(),
    id: ventureId,
    name: `Venture ${ventureId.slice(0, 8)}`,
  };
}

function resolveMode(input: BuildPipelineInput): PipelineMode {
  if (input.mode) return input.mode;
  const flags = getExecutionFlagsSnapshot();
  if (flags.enableRealBuildFlow && flags.enableRealExecution) return "real";
  return "dry_run";
}

export function getBuildPipelinePolicy(): BuildPipelinePolicy {
  const policy = getBuildFlowPolicySummary();
  const flags = getExecutionFlagsSnapshot();
  return {
    enableRealBuildFlow: policy.enableRealBuildFlow,
    enableRealExecution: flags.enableRealExecution,
    requireApproval: policy.requireApproval,
    defaultMode: "dry_run",
    previewOnly: true,
    productionBlocked: true,
  };
}

function stepStatusFromResult(
  status: string
): PipelineStage["status"] {
  if (status === "completed") return "completed";
  if (status === "blocked") return "blocked";
  if (status === "failed") return "failed";
  if (status === "skipped") return "skipped";
  if (status === "running") return "running";
  return "pending";
}

function buildTimeline(stages: PipelineStage[], pipelineId: string): PipelineTimelineEvent[] {
  const now = new Date().toISOString();
  return stages.map((stage, i) => ({
    id: `${pipelineId}-${stage.id}`,
    timestamp: new Date(Date.now() - (stages.length - i) * 1000).toISOString(),
    stage: stage.id,
    label: stage.label,
    status: stage.status,
    provider: stage.provider,
    message: stage.output ?? stage.label,
  })).concat([{
    id: `${pipelineId}-now`,
    timestamp: now,
    stage: "audit_trail" as PipelineStageId,
    label: "Pipeline actualizado",
    status: "completed" as const,
    provider: undefined,
    message: "Snapshot del pipeline generado",
  }]);
}

function buildRepositoryPlan(
  ventureName: string,
  mode: PipelineMode,
  pipelineId: string,
  executed: boolean
): RepositoryPlan {
  const repoName = slugify(ventureName);
  return {
    planId: `repo-${pipelineId}`,
    repoName,
    visibility: "private",
    branch: "forgeos/init",
    scaffold: true,
    mode,
    proposedUrl: `https://github.com/forgeos/${repoName}`,
    status: executed ? "created" : mode === "dry_run" ? "dry_run" : "proposed",
  };
}

function buildProjectPlans(ventureName: string, mode: PipelineMode, pipelineId: string): ProjectPlan[] {
  const slug = slugify(ventureName);
  return [
    {
      planId: `proj-sb-${pipelineId}`,
      provider: "supabase",
      projectName: `${slug}-sandbox`,
      environment: "sandbox",
      mode,
      summary: `Proyecto Supabase sandbox para ${ventureName}`,
    },
    {
      planId: `proj-vc-${pipelineId}`,
      provider: "vercel",
      projectName: slug,
      environment: "preview",
      mode,
      summary: `Proyecto Vercel preview para ${ventureName}`,
    },
  ];
}

function buildDeployPreviewPlan(ventureName: string, mode: PipelineMode, pipelineId: string): DeployPreviewPlan {
  const slug = slugify(ventureName);
  return {
    planId: `dpl-${pipelineId}`,
    target: "preview",
    production: false,
    previewUrl: `https://${slug}-preview.vercel.app`,
    vercelProject: slug,
    mode,
    summary: `Deploy preview (nunca producción) para ${ventureName}`,
  };
}

export async function runBuildPipelineDryRun(
  input: BuildPipelineInput
): Promise<BuildPipelineSnapshot> {
  const venture = resolveVenture(input.ventureId);
  const mode: PipelineMode = "dry_run";
  const pipelineId = `bp-${venture.id}-${Date.now().toString(36)}`;
  const stages: PipelineStage[] = [];
  const started = Date.now();

  const health = await getConnectionsHealth();
  stages.push({
    id: "connections_health",
    label: "Salud de conexiones",
    status: health.every((h) => h.configured) ? "completed" : "completed",
    output: health.map((h) => `${h.provider}: ${h.configured ? "configurado" : "sin credencial"}`).join(" · "),
    requiresApproval: false,
    executed: false,
    latencyMs: Date.now() - started,
  });

  const policy = getBuildPipelinePolicy();
  stages.push({
    id: "approval_gate",
    label: "Puerta de aprobación",
    status: policy.requireApproval ? "pending" : "skipped",
    output: policy.requireApproval
      ? "Aprobación humana requerida antes de ejecución real"
      : "Aprobación no requerida por política",
    requiresApproval: policy.requireApproval,
    executed: false,
    latencyMs: 0,
  });

  const dryRun = await runBuildFlowDryRun({
    ventureId: input.ventureId,
    venture,
    requestedBy: input.requestedBy,
    environment: "dry_run",
  });

  stages.push({
    id: "dry_run",
    label: "Dry-run completo",
    status: "completed",
    output: `Dry-run ${dryRun.flowId} — ${dryRun.steps.length} pasos simulados`,
    requiresApproval: false,
    executed: false,
    latencyMs: 0,
  });

  const risk = assessPipelineRisk(dryRun, mode);
  stages.push({
    id: "risk_assessment",
    label: "Evaluación de riesgo",
    status: risk.blocked ? "blocked" : "completed",
    output: `Riesgo ${risk.level} (score ${risk.score})`,
    requiresApproval: false,
    executed: false,
    latencyMs: 0,
  });

  const repoName = slugify(venture.name);
  const githubRepo = await runPipelineGitHubStep({
    ventureId: venture.id,
    ventureName: venture.name,
    requestedBy: input.requestedBy,
    repoName,
    mode,
    step: "github_repo",
  });
  stages.push({
    id: "github_repository",
    label: "Repositorio GitHub",
    status: stepStatusFromResult(githubRepo.status),
    provider: "github",
    output: githubRepo.output,
    requiresApproval: true,
    executed: githubRepo.executed,
    latencyMs: githubRepo.latencyMs,
  });

  const supabase = await runPipelineSupabaseStep({
    ventureId: venture.id,
    ventureName: venture.name,
    requestedBy: input.requestedBy,
    mode,
  });
  stages.push({
    id: "supabase_project",
    label: "Proyecto Supabase",
    status: stepStatusFromResult(supabase.status),
    provider: "supabase",
    output: supabase.output,
    requiresApproval: true,
    executed: supabase.executed,
    latencyMs: supabase.latencyMs,
  });

  const vercel = await runPipelineVercelStep({
    ventureId: venture.id,
    ventureName: venture.name,
    requestedBy: input.requestedBy,
    mode,
  });
  stages.push({
    id: "vercel_project",
    label: "Proyecto Vercel",
    status: stepStatusFromResult(vercel.status),
    provider: "vercel",
    output: vercel.output,
    requiresApproval: true,
    executed: vercel.executed,
    latencyMs: vercel.latencyMs,
  });

  const deployPreviewPlan = buildDeployPreviewPlan(venture.name, mode, pipelineId);
  stages.push({
    id: "deploy_preview",
    label: "Plan deploy preview",
    status: "completed",
    provider: "vercel",
    output: deployPreviewPlan.summary,
    requiresApproval: true,
    executed: false,
    latencyMs: 0,
  });

  const migrationPlan = generateMigrationPlan(dryRun, mode);
  stages.push({
    id: "migration_plan",
    label: "Plan de migración",
    status: "completed",
    provider: "supabase",
    output: migrationPlan.summary,
    requiresApproval: false,
    executed: false,
    latencyMs: 0,
  });

  const rollbackPlan = generateRollbackPlan(dryRun);
  stages.push({
    id: "rollback_plan",
    label: "Plan de rollback",
    status: rollbackPlan.ready ? "completed" : "blocked",
    output: rollbackPlan.summary,
    requiresApproval: false,
    executed: false,
    latencyMs: 0,
  });

  const buildReport = generateBuildReport({ dryRun, stages, mode });
  stages.push({
    id: "build_report",
    label: "Informe de build",
    status: "completed",
    output: `Informe ${buildReport.reportId} generado`,
    requiresApproval: false,
    executed: false,
    latencyMs: 0,
  });

  auditPipelineDryRun({
    pipelineId,
    ventureId: venture.id,
    details: `Dry-run pipeline para ${venture.name}`,
  });

  stages.push({
    id: "audit_trail",
    label: "Auditoría",
    status: "completed",
    output: "Entradas de auditoría registradas",
    requiresApproval: false,
    executed: false,
    latencyMs: 0,
  });

  return {
    pipelineId,
    mode,
    stages,
    connectionHealth: health,
    repositoryPlan: buildRepositoryPlan(venture.name, mode, pipelineId, false),
    projectPlans: buildProjectPlans(venture.name, mode, pipelineId),
    deployPreviewPlan,
    migrationPlan,
    rollbackPlan,
    buildReport,
    risk,
    audit: getPipelineAuditLog(venture.id),
    timeline: buildTimeline(stages, pipelineId),
    dryRunResult: dryRun,
  };
}

export async function requestBuildPipelineApproval(input: BuildPipelineInput) {
  const snapshot = await runBuildPipelineDryRun(input);
  const approval = await requestBuildFlowApproval({
    ventureId: input.ventureId,
    requestedBy: input.requestedBy,
  });
  return { snapshot, approval };
}

export async function executeBuildPipeline(
  input: BuildPipelineInput
): Promise<BuildPipelineSnapshot> {
  const mode = resolveMode(input);
  const venture = resolveVenture(input.ventureId);
  const pipelineId = `bp-${venture.id}-${Date.now().toString(36)}`;

  if (mode === "dry_run" || !getBuildPipelinePolicy().enableRealBuildFlow) {
    return runBuildPipelineDryRun(input);
  }

  const executeResult = await executeBuildFlow({
    ventureId: input.ventureId,
    venture,
    requestedBy: input.requestedBy,
    approvalSessionId: input.approvalSessionId,
    userConfirmed: input.userConfirmed,
  });

  const resolvedMode: PipelineMode = mode === "real" ? "real" : "preview";
  const health = await getConnectionsHealth();
  const risk = assessPipelineRisk(executeResult, resolvedMode);
  const rollbackPlan = generateRollbackPlan(executeResult);
  const migrationPlan = generateMigrationPlan(executeResult, resolvedMode);
  const deployPreviewPlan = buildDeployPreviewPlan(venture.name, resolvedMode, pipelineId);

  const stages: PipelineStage[] = executeResult.steps
    .filter((s) =>
      [
        "github_repo",
        "supabase_sandbox",
        "vercel_preview",
        "human_approval",
        "risk_check",
        "dry_run",
      ].includes(s.stepId)
    )
    .map((s) => ({
      id: mapStepId(s.stepId),
      label: s.label,
      status: stepStatusFromResult(s.status),
      provider: s.provider,
      output: s.output,
      requiresApproval: s.stepId === "human_approval",
      executed: s.executed,
      latencyMs: s.latencyMs,
    }));

  stages.unshift({
    id: "connections_health",
    label: "Salud de conexiones",
    status: "completed",
    output: health.map((h) => `${h.provider}: ${h.healthy ? "ok" : "pendiente"}`).join(" · "),
    requiresApproval: false,
    executed: false,
    latencyMs: 0,
  });

  const buildReport = generateBuildReport({
    dryRun: executeResult,
    stages,
    mode: resolvedMode,
    executeResult,
  });

  auditPipelineExecuted({
    pipelineId,
    ventureId: venture.id,
    success: executeResult.success,
    details: executeResult.success ? "Pipeline ejecutado en preview" : "Pipeline con fallos",
  });

  return {
    pipelineId,
    mode: resolvedMode,
    stages,
    connectionHealth: health,
    repositoryPlan: buildRepositoryPlan(venture.name, resolvedMode, pipelineId, executeResult.success),
    projectPlans: buildProjectPlans(venture.name, resolvedMode, pipelineId),
    deployPreviewPlan,
    migrationPlan,
    rollbackPlan,
    buildReport,
    risk,
    audit: getPipelineAuditLog(venture.id),
    timeline: buildTimeline(stages, pipelineId),
    dryRunResult: executeResult,
    executeResult,
    approvalSession: input.approvalSessionId
      ? getApprovalSession(input.approvalSessionId) ?? undefined
      : undefined,
  };
}

function mapStepId(stepId: string): PipelineStageId {
  const map: Record<string, PipelineStageId> = {
    github_repo: "github_repository",
    supabase_sandbox: "supabase_project",
    vercel_preview: "deploy_preview",
    human_approval: "approval_gate",
    risk_check: "risk_assessment",
    dry_run: "dry_run",
  };
  return map[stepId] ?? "audit_trail";
}

export async function getBuildPipelineSnapshot(
  ventureId: string,
  requestedBy: string
): Promise<BuildPipelineSnapshot> {
  return runBuildPipelineDryRun({ ventureId, requestedBy });
}
