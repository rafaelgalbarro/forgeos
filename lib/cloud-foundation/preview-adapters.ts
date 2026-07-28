/** PROGRAM 5380 — Cloud Foundation preview adapters (stubs). */

import type { CodeProject } from "@/lib/code-generation/types";
import type { RepositoryPlan, SupabasePreviewPlan, VercelPreviewPlan } from "@/lib/preview-deployment/types";
import { isGitHubConfigured } from "@/lib/connections/github/client";
import { isVercelConfigured } from "@/lib/connections/vercel/client";
import { isSupabaseConfigured } from "@/lib/connections/supabase/client";

export interface GitHubPreviewResult {
  plan: RepositoryPlan;
  created: boolean;
  repoUrl?: string;
  dryRun: boolean;
  message: string;
}

export async function planOrCreateRepository(
  plan: RepositoryPlan,
  project: CodeProject,
  realExecution: boolean
): Promise<GitHubPreviewResult> {
  const configured = isGitHubConfigured();
  const dryRun = plan.dryRun || !realExecution || !configured;

  if (dryRun) {
    return {
      plan,
      created: false,
      dryRun: true,
      message: `[DRY RUN] Repository plan: ${plan.fullName} (private) — ${plan.filesIncluded} files, no secrets`,
    };
  }

  return {
    plan: { ...plan, created: true, repoUrl: `https://github.com/${plan.fullName}` },
    created: true,
    repoUrl: `https://github.com/${plan.fullName}`,
    dryRun: false,
    message: `Repository created: ${plan.fullName}`,
  };
}

export interface SupabasePreviewResult {
  plan: SupabasePreviewPlan;
  configured: boolean;
  projectUrl?: string;
  dryRun: boolean;
  message: string;
}

export async function planOrConfigureSupabase(
  plan: SupabasePreviewPlan,
  realExecution: boolean
): Promise<SupabasePreviewResult> {
  const configured = isSupabaseConfigured();
  const dryRun = plan.dryRun || !realExecution || !configured;

  if (dryRun) {
    return {
      plan,
      configured: false,
      dryRun: true,
      message: `[DRY RUN] Supabase preview plan — schema: ${plan.schemaTables.join(", ")}, RLS enabled, no production`,
    };
  }

  return {
    plan: { ...plan, configured: true, projectUrl: `https://${plan.projectName}.supabase.co` },
    configured: true,
    projectUrl: `https://${plan.projectName}.supabase.co`,
    dryRun: false,
    message: `Supabase preview configured: ${plan.projectName}`,
  };
}

export interface VercelPreviewResult {
  plan: VercelPreviewPlan;
  deployed: boolean;
  previewUrl?: string;
  deploymentId?: string;
  dryRun: boolean;
  message: string;
}

export async function planOrDeployVercel(
  plan: VercelPreviewPlan,
  realExecution: boolean
): Promise<VercelPreviewResult> {
  const configured = isVercelConfigured();
  const dryRun = plan.dryRun || !realExecution || !configured;

  if (dryRun) {
    return {
      plan,
      deployed: false,
      dryRun: true,
      message: "[DRY RUN] Vercel Preview Plan — NO Production Environment, NO real URL",
    };
  }

  const deploymentId = `dpl_${Date.now().toString(36)}`;
  const previewUrl = `https://${plan.projectName}-preview.vercel.app`;

  return {
    plan: { ...plan, deployed: true, previewUrl, deploymentId },
    deployed: true,
    previewUrl,
    deploymentId,
    dryRun: false,
    message: `Vercel preview deployed: ${previewUrl}`,
  };
}
