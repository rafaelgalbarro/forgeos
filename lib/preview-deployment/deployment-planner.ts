/** PROGRAM 5380 — Deployment step planner. */

import type { CodeProject } from "@/lib/code-generation/types";
import { getGitHubOrg } from "@/lib/cloud-foundation/config";
import { slugify } from "@/lib/code-generation/code-project";
import { getPreviewDeploymentPolicy } from "./config";
import type {
  CodePushResult,
  PreviewDeploymentRequest,
  RepositoryPlan,
  SupabasePreviewPlan,
  VercelPreviewPlan,
} from "./types";

export interface DeploymentPlan {
  steps: { id: string; label: string; provider?: string; dryRun: boolean }[];
  repository: RepositoryPlan;
  supabase: SupabasePreviewPlan;
  vercel: VercelPreviewPlan;
  estimatedDurationMs: number;
  dryRun: boolean;
}

export function buildDeploymentPlan(
  project: CodeProject,
  request: PreviewDeploymentRequest
): DeploymentPlan {
  const policy = getPreviewDeploymentPolicy();
  const org = getGitHubOrg();
  const repoName = slugify(project.name);
  const dryRun = !policy.enablePreviewDeployment || request.dryRun;

  const safeFiles = project.files.filter(
    (f) =>
      !f.path.includes(".env.local") &&
      !f.path.includes("credentials") &&
      !f.path.endsWith(".pem")
  );

  const repository: RepositoryPlan = {
    org,
    name: repoName,
    fullName: `${org}/${repoName}`,
    visibility: "private",
    defaultBranch: "preview/studio",
    initialCommitMessage: `Preview deployment ${request.releaseVersion} — ${project.name}`,
    filesIncluded: safeFiles.length + 3,
    filesExcluded: [".env.local", "credentials.json", "*.pem"],
    dryRun: dryRun || !policy.enableGithubPush,
  };

  const supabase: SupabasePreviewPlan = {
    projectName: `${repoName}-preview`,
    environment: "preview",
    schemaTables: project.database?.migrations.length
      ? ["ventures", "users", "audit_log"]
      : ["ventures"],
    migrations: project.database?.migrations ?? ["001_initial_schema.sql"],
    seedPlan: "Demo seed — sandbox only, no production data",
    rlsEnabled: true,
    rollbackSteps: ["Revert migration", "Drop preview schema", "Restore sandbox snapshot"],
    dryRun: dryRun || !policy.enableSupabaseSetup,
  };

  const vercel: VercelPreviewPlan = {
    projectName: repoName,
    environment: "preview",
    buildCommand: project.scripts.find((s) => s.name === "build")?.command ?? "npm run build",
    envVars: project.environmentVariables
      .filter((v) => !v.secret)
      .map((v) => ({ key: v.key, value: v.example, preview: true as const })),
    smokeTestPlan: ["home", "demo-login", "dashboard", "api-health"],
    dryRun: dryRun || !policy.enableVercelDeployment,
  };

  const steps = [
    { id: "validate", label: "Validate preconditions", dryRun: true },
    { id: "approval", label: "Await approval", dryRun: true },
    { id: "repository", label: "Create repository", provider: "github", dryRun: repository.dryRun },
    { id: "push", label: "Push code", provider: "github", dryRun: repository.dryRun },
    { id: "supabase", label: "Configure Supabase preview", provider: "supabase", dryRun: supabase.dryRun },
    { id: "vercel", label: "Deploy Vercel preview", provider: "vercel", dryRun: vercel.dryRun },
    { id: "health", label: "Health check", dryRun: vercel.dryRun },
    { id: "smoke", label: "Smoke tests", dryRun: vercel.dryRun },
  ];

  return {
    steps,
    repository,
    supabase,
    vercel,
    estimatedDurationMs: dryRun ? 5000 : 120000,
    dryRun,
  };
}

export function buildCodePushPlan(project: CodeProject, branch: string): CodePushResult {
  const safeFiles = project.files.filter(
    (f) => !f.path.includes(".env.local") && !f.path.includes("credentials")
  );
  const checksums: Record<string, string> = {};
  for (const f of safeFiles) checksums[f.path] = f.checksum;

  return {
    branch,
    commitSha: `sha-${Date.now().toString(36)}`,
    filesRegistered: safeFiles.length,
    checksums,
    warnings: project.files.length > safeFiles.length ? ["Excluded secret/credential files"] : [],
    forcePush: false,
    dryRun: true,
  };
}
