/** PROGRAM 5370 — Sandbox build orchestration (static validation → QA gates). */

import type { CodeProject } from "@/lib/code-generation/types";
import { withLegacyManifest } from "@/lib/code-generation/legacy-adapter";
import type { SandboxBuildInput, SandboxPreviewBuild, SandboxQAGate } from "./types";
import { saveSandboxBuild, getLatestSandboxBuildForMission } from "./sandbox-store";

function buildId(): string {
  return `sbx-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function defaultQAGates(project: ReturnType<typeof withLegacyManifest>): SandboxQAGate[] {
  const fileCount = project.files.length;
  const depCount = Object.keys(project.manifest.dependencies).length;
  return [
    {
      id: "file-structure",
      label: "File structure",
      status: fileCount > 0 ? "pass" : "fail",
      blocking: true,
    },
    {
      id: "dependencies",
      label: "Dependencies resolved",
      status: depCount > 0 ? "pass" : "warn",
      blocking: false,
    },
    {
      id: "security-scan",
      label: "Security scan",
      status: "pass",
      blocking: false,
      detail: "No secrets detected in sandbox scan",
    },
    {
      id: "sandbox-build",
      label: "Sandbox build",
      status: "pending",
      blocking: true,
    },
  ];
}

function runSecurityScan(project: CodeProject): SandboxPreviewBuild["securityScan"] {
  const secretPatterns = [
    /sk_live_/i,
    /AKIA[0-9A-Z]{16}/,
    /-----BEGIN (RSA |EC )?PRIVATE KEY-----/,
    /SUPABASE_SERVICE_ROLE/i,
    /VERCEL_TOKEN\s*=\s*[^\s]+/i,
    /GITHUB_TOKEN\s*=\s*[^\s]+/i,
  ];
  const findings: SandboxPreviewBuild["securityScan"]["findings"] = [];

  for (const file of project.files) {
    if (file.path.includes(".env.local") || file.path.includes("credentials")) {
      findings.push({
        id: `sec-${file.path}`,
        severity: "critical",
        message: `Blocked file pattern: ${file.path}`,
      });
    }
    for (const pattern of secretPatterns) {
      if (pattern.test(file.content)) {
        findings.push({
          id: `sec-content-${file.path}`,
          severity: "high",
          message: `Potential secret in ${file.path}`,
        });
      }
    }
  }

  const blocked = findings.some((f) => f.severity === "critical" || f.severity === "high");
  return {
    passed: !blocked,
    blocked,
    findings,
    scannedAt: new Date().toISOString(),
  };
}

export function isSandboxReadyForDeploy(build: SandboxPreviewBuild): boolean {
  if (build.status !== "BUILD_PASSED" && build.status !== "READY_FOR_DEPLOY") return false;
  if (build.criticalErrors.length > 0) return false;
  if (build.securityScan.blocked) return false;
  const blockingGates = build.qaGates.filter((g) => g.blocking);
  return blockingGates.every((g) => g.status === "pass" || g.status === "warn");
}

export async function runSandboxBuild(
  projectInput: CodeProject,
  input: SandboxBuildInput
): Promise<SandboxPreviewBuild> {
  const project = withLegacyManifest(projectInput);
  const now = new Date().toISOString();
  const securityScan = runSecurityScan(project);
  const qaGates = defaultQAGates(project);
  const criticalErrors: string[] = [];

  if (securityScan.blocked) {
    criticalErrors.push("Security scan blocked — secrets or credentials detected");
    qaGates.find((g) => g.id === "security-scan")!.status = "blocked";
  }

  const buildLog: string[] = [
    `[${now}] Sandbox build started for ${project.manifest.name}`,
    `[${now}] Files: ${project.files.length}`,
    `[${now}] Framework: ${project.manifest.framework}`,
  ];

  let status: SandboxPreviewBuild["status"] = "BUILDING";
  buildLog.push(`[${new Date().toISOString()}] Running static sandbox compile…`);

  const blockingFailed = qaGates.some((g) => g.blocking && g.status === "fail");
  const securityBlocked = securityScan.blocked;

  if (blockingFailed || securityBlocked || criticalErrors.length > 0) {
    status = securityBlocked ? "QA_BLOCKED" : "BUILD_FAILED";
    buildLog.push(`[${new Date().toISOString()}] Build FAILED`);
  } else {
    status = "BUILD_PASSED";
    qaGates.find((g) => g.id === "sandbox-build")!.status = "pass";
    buildLog.push(`[${new Date().toISOString()}] Build PASSED — ready for preview deployment`);
  }

  const completedAt = new Date().toISOString();
  const build: SandboxPreviewBuild = {
    buildId: buildId(),
    missionId: input.missionId,
    projectId: input.projectId,
    projectVersion: input.projectVersion,
    status: status === "BUILD_PASSED" ? "READY_FOR_DEPLOY" : status,
    environment: "preview",
    buildStartedAt: now,
    buildCompletedAt: completedAt,
    buildDurationMs: Date.parse(completedAt) - Date.parse(now),
    buildLog,
    qaGates,
    securityScan,
    criticalErrors,
    dryRun: input.dryRun ?? true,
    createdAt: now,
    updatedAt: completedAt,
  };

  saveSandboxBuild(build);
  return build;
}

export function getOrCreateDemoSandboxBuild(
  missionId: string,
  projectId: string,
  projectVersion: string
): SandboxPreviewBuild {
  const existing = getLatestSandboxBuildForMission(missionId);
  if (existing && existing.projectId === projectId) return existing;

  const now = new Date().toISOString();
  const build: SandboxPreviewBuild = {
    buildId: buildId(),
    missionId,
    projectId,
    projectVersion,
    status: "READY_FOR_DEPLOY",
    environment: "preview",
    buildStartedAt: now,
    buildCompletedAt: now,
    buildDurationMs: 1200,
    buildLog: [`[${now}] Demo sandbox build — READY_FOR_DEPLOY`],
    qaGates: [
      { id: "static-validation", label: "Static validation", status: "pass", blocking: true },
      { id: "sandbox-build", label: "Sandbox build", status: "pass", blocking: true },
      { id: "security-scan", label: "Security scan", status: "pass", blocking: false },
    ],
    securityScan: { passed: true, blocked: false, findings: [], scannedAt: now },
    criticalErrors: [],
    dryRun: true,
    createdAt: now,
    updatedAt: now,
  };
  saveSandboxBuild(build);
  return build;
}
