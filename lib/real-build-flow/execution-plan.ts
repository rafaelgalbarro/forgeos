/** ForgeOS Real Build Flow — execution planner (RC5.2). */

import type { BuildContext } from "@/lib/build-platform/build-context";
import type { BuildDna } from "@/lib/build-platform/build-dna";
import type { ReleasePackage } from "@/lib/build-platform/release-manager/types";
import type { BuildFlowEnvironment, BuildFlowExecutionPlan, BuildFlowPlanStep } from "./types";
import { isBuildFlowApprovalRequired } from "./validator";

export function generateBuildFlowExecutionPlan(params: {
  ventureId: string;
  ventureName: string;
  buildContext: BuildContext;
  buildDna: BuildDna;
  releasePackage: ReleasePackage;
  environment: BuildFlowEnvironment;
}): BuildFlowExecutionPlan {
  const steps: BuildFlowPlanStep[] = [
    { order: 1, stepId: "select_venture", label: "Select Venture", dependencies: [] },
    { order: 2, stepId: "read_build_context", label: "Read Build Context", dependencies: ["select_venture"] },
    { order: 3, stepId: "read_build_dna", label: "Read Build DNA", dependencies: ["read_build_context"] },
    { order: 4, stepId: "read_release_package", label: "Read Release Package", dependencies: ["read_build_dna"] },
    { order: 5, stepId: "generate_execution_plan", label: "Generate Execution Plan", dependencies: ["read_release_package"] },
    { order: 6, stepId: "dry_run", label: "Full Dry-Run", dependencies: ["generate_execution_plan"] },
    { order: 7, stepId: "risk_check", label: "Risk Check", dependencies: ["dry_run"] },
    { order: 8, stepId: "human_approval", label: "Human Approval", dependencies: ["risk_check"] },
    {
      order: 9,
      stepId: "github_repo",
      label: "Create Private GitHub Repo",
      provider: "github",
      capabilityId: "create_repository",
      operation: "create_repository",
      dependencies: ["human_approval"],
    },
    {
      order: 10,
      stepId: "github_branch",
      label: "Create Initial Branch",
      provider: "github",
      capabilityId: "create_branch",
      operation: "create_branch",
      dependencies: ["github_repo"],
    },
    {
      order: 11,
      stepId: "project_scaffold",
      label: "Generate Base Project Structure",
      provider: "github",
      capabilityId: "create_repository",
      operation: "prepare_scaffold",
      dependencies: ["github_branch"],
    },
    {
      order: 12,
      stepId: "supabase_sandbox",
      label: "Prepare Supabase Sandbox",
      provider: "supabase",
      capabilityId: "create_database",
      operation: "create_database",
      dependencies: ["project_scaffold"],
    },
    {
      order: 13,
      stepId: "vercel_preview",
      label: "Prepare Vercel Preview",
      provider: "vercel",
      capabilityId: "deploy_software",
      operation: "deploy_software",
      dependencies: ["supabase_sandbox"],
    },
    { order: 14, stepId: "audit_log", label: "Register Audit Log", dependencies: ["vercel_preview"] },
    { order: 15, stepId: "rollback_plan", label: "Register Rollback Plan", dependencies: ["audit_log"] },
    { order: 16, stepId: "final_result", label: "Final Result", dependencies: ["rollback_plan"] },
  ];

  return {
    planId: `bfp-${params.ventureId.slice(0, 8)}-${Date.now().toString(36)}`,
    ventureId: params.ventureId,
    ventureName: params.ventureName,
    environment: params.environment,
    steps,
    estimatedDurationMs: 120_000,
    rollbackSteps: [
      "Archive Vercel preview deployment",
      "Mark Supabase sandbox migrations as pending",
      "Close GitHub PR if opened",
      "Retain private repo (no delete — non-destructive policy)",
    ],
    recoverySteps: [
      `Re-run dry-run for venture ${params.ventureName}`,
      "Re-approve via RC5.1 session if expired",
      `Restore from release package ${params.releasePackage.releaseId}`,
    ],
    requiresApproval: isBuildFlowApprovalRequired(),
  };
}
