/** PROGRAM 5370 — Sandbox manager — CRUD and lifecycle orchestration. */

import type { CodeProject } from "@/lib/code-generation/types";
import { loadCodeProject } from "@/lib/code-generation/project-loader";
import { withLegacyManifest } from "@/lib/code-generation/legacy-adapter";
import type { CodeProjectKind } from "@/lib/code-generation/types";
import type {
  PreviewSandbox,
  StartSandboxRequest,
  SandboxListFilter,
  PaginatedLogs,
  BuildResultStatus,
} from "./types";
import {
  generateSandboxId,
  saveSandbox,
  getSandbox,
  listSandboxes,
  appendLog,
  getLogs,
  updateSandboxStatus,
} from "./sandbox-store";
import { detectDocker, resolveIsolationStrategy } from "./docker-detection";
import { findFreePort } from "./port-utils";
import { computeExpiresAt, assertTransition } from "./sandbox-lifecycle";
import { buildPreviewUrl } from "./security/network-policy";
import { checkResourceLimits, DEFAULT_RESOURCE_LIMITS } from "./security/resource-limits";
import { validateDependencies, scanPackageJsonForPostinstall } from "./dependency-validator";
import { normalizeErrors } from "./error-normalizer";
import { extractWarnings } from "./error-parser";
import { generateRepairPlan, linkRepairPlanToChangeRequest } from "./repair-plan";
import {
  createWorkspace,
  writeProjectFiles,
  runInstall,
  runBuild,
  startPreviewServer,
  stopProcess,
  cleanupWorkspace,
  buildSandboxEnv,
} from "./sandbox-runner";
import { waitForHealthy } from "./sandbox-health";

export async function startSandbox(request: StartSandboxRequest): Promise<PreviewSandbox> {
  const id = generateSandboxId();
  const docker = await detectDocker();
  const isolation = resolveIsolationStrategy(docker);

  const raw = await loadCodeProject({
    missionId: request.missionId,
    outputId: request.outputId,
    factoryProjectId: request.factoryProjectId,
    kind: request.projectKind as CodeProjectKind | undefined,
  });

  if (!raw) {
    throw new Error("Could not load CodeProject for sandbox");
  }

  const project = withLegacyManifest(raw);

  const workspaceDir = await createWorkspace(id);
  const port = project.manifest.kind === "mobile" ? undefined : await findFreePort();

  const sandbox: PreviewSandbox = {
    id,
    missionId: request.missionId,
    outputId: request.outputId,
    projectId: project.manifest.projectId,
    projectKind: project.manifest.kind,
    status: "PENDING",
    isolation,
    workspaceDir,
    port,
    previewUrl: port ? buildPreviewUrl(port) : undefined,
    resources: { elapsedMs: 0 },
    logs: [],
    env: buildSandboxEnv(project.manifest, port),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: computeExpiresAt(),
  };

  saveSandbox(sandbox);
  appendLog(id, { timestamp: new Date().toISOString(), stream: "system", level: "info", message: `Isolation: ${isolation} — ${docker.message}`, phase: "init" });

  return runSandboxPipeline(sandbox, project);
}

async function runSandboxPipeline(
  sandbox: PreviewSandbox,
  project: ReturnType<typeof withLegacyManifest>
): Promise<PreviewSandbox> {
  const startTime = Date.now();

  try {
    transition(sandbox, "PREPARING");
    await writeProjectFiles(sandbox.workspaceDir, project);
    appendLog(sandbox.id, { timestamp: new Date().toISOString(), stream: "system", level: "info", message: `Workspace: ${sandbox.workspaceDir}`, phase: "prepare" });

    const depCheck = validateDependencies(project.manifest.dependencies, project.manifest.devDependencies);
    const pkgFile = project.files.find((f) => f.path === "package.json");
    if (pkgFile) depCheck.warnings.push(...scanPackageJsonForPostinstall(pkgFile.content));

    for (const w of depCheck.warnings) {
      appendLog(sandbox.id, { timestamp: new Date().toISOString(), stream: "system", level: "warn", message: w, phase: "deps" });
    }

    if (!depCheck.allowed) {
      throw new Error(`Blocked dependencies: ${depCheck.blocked.join("; ")}`);
    }

    appendLog(sandbox.id, { timestamp: new Date().toISOString(), stream: "system", level: "info", message: `Packages: ${depCheck.packages.length}`, phase: "deps" });

    if (project.manifest.kind === "mobile") {
      return handleMobilePreview(sandbox, project);
    }

    transition(sandbox, "INSTALLING");
    const installResult = await runInstall(sandbox, project);
    appendLog(sandbox.id, { timestamp: new Date().toISOString(), stream: "system", level: "info", message: `Install done in ${installResult.durationMs}ms (exit ${installResult.exitCode})`, phase: "install" });

    if (installResult.exitCode !== 0) {
      return failSandbox(sandbox, installResult.stdout, installResult.stderr, "dependency install failed", installResult.durationMs);
    }

    transition(sandbox, "BUILDING");
    let buildResult;
    try {
      buildResult = await runBuild(sandbox, project);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Build timeout";
      return failSandbox(sandbox, "", msg, msg, Date.now() - startTime, "BUILD_TIMEOUT");
    }

    const errors = normalizeErrors(buildResult.stdout, buildResult.stderr);
    const warnings = extractWarnings(buildResult.stdout + buildResult.stderr);
    const buildStatus: BuildResultStatus = buildResult.exitCode === 0 ? "BUILD_PASSED" : "BUILD_FAILED";

    sandbox.build = {
      status: buildStatus,
      exitCode: buildResult.exitCode,
      durationMs: buildResult.durationMs,
      stdout: buildResult.stdout.slice(-8000),
      stderr: buildResult.stderr.slice(-8000),
      errors,
      warnings,
      routes: project.manifest.routes.map((r) => r.path),
    };
    saveSandbox(sandbox);

    if (buildStatus !== "BUILD_PASSED") {
      const plan = generateRepairPlan(sandbox.id, sandbox.missionId, errors, sandbox.outputId);
      if (plan && sandbox.outputId) sandbox.repairPlan = await linkRepairPlanToChangeRequest(plan, sandbox.outputId);
      else if (plan) sandbox.repairPlan = plan;
      transition(sandbox, "FAILED");
      sandbox.error = errors[0]?.message ?? "Build failed";
      saveSandbox(sandbox);
      return sandbox;
    }

    transition(sandbox, "STARTING");
    const proc = startPreviewServer(sandbox, project);
    sandbox.pid = proc.pid;

    if (sandbox.port) {
      const health = await waitForHealthy(sandbox.port);
      sandbox.health = health;
      if (health.ok) {
        transition(sandbox, "READY");
      } else {
        transition(sandbox, "DEGRADED");
        sandbox.error = health.message;
      }
    } else {
      transition(sandbox, "READY");
    }

    sandbox.resources.elapsedMs = Date.now() - startTime;
    saveSandbox(sandbox);
    return sandbox;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Sandbox pipeline failed";
    return failSandbox(sandbox, "", msg, msg, Date.now() - startTime);
  }
}

function handleMobilePreview(
  sandbox: PreviewSandbox,
  project: ReturnType<typeof withLegacyManifest>
): PreviewSandbox {
  const hasExpo = Boolean(process.env.EXPO_TOKEN || process.env.EXPO_PUBLIC_PROJECT_ID);
  sandbox.mobilePreviewPlan = hasExpo
    ? "Expo preview available — scan QR on device (localhost tunnel)"
    : "Preview Plan: Expo CLI no configurado en este entorno. Sin QR falso — configure EXPO_TOKEN para preview real.";
  sandbox.expoQrSafe = hasExpo;
  sandbox.build = {
    status: "BUILD_SKIPPED",
    durationMs: 0,
    stdout: "",
    stderr: "",
    errors: [],
    warnings: ["Mobile preview uses Preview Plan when Expo env unavailable"],
  };
  transition(sandbox, hasExpo ? "DEGRADED" : "READY");
  saveSandbox(sandbox);
  return sandbox;
}

function failSandbox(
  sandbox: PreviewSandbox,
  stdout: string,
  stderr: string,
  error: string,
  durationMs: number,
  buildStatus: BuildResultStatus = "BUILD_FAILED"
): PreviewSandbox {
  const errors = normalizeErrors(stdout, stderr);
  const plan = generateRepairPlan(sandbox.id, sandbox.missionId, errors.length ? errors : [{ category: "build", message: error }], sandbox.outputId);
  if (plan) sandbox.repairPlan = plan;

  sandbox.build = {
    status: buildStatus,
    durationMs,
    stdout: stdout.slice(-4000),
    stderr: stderr.slice(-4000),
    errors,
    warnings: extractWarnings(stdout + stderr),
  };
  sandbox.error = error;
  transition(sandbox, "FAILED");
  saveSandbox(sandbox);
  return sandbox;
}

function transition(sandbox: PreviewSandbox, to: PreviewSandbox["status"]): void {
  assertTransition(sandbox.status, to);
  sandbox.status = to;
  sandbox.updatedAt = new Date().toISOString();
  saveSandbox(sandbox);
}

export async function stopSandbox(id: string): Promise<PreviewSandbox | undefined> {
  const sandbox = getSandbox(id);
  if (!sandbox) return undefined;

  if (sandbox.status !== "STOPPING") {
    try { assertTransition(sandbox.status, "STOPPING"); } catch { /* force stop */ }
    sandbox.status = "STOPPING";
  }

  stopProcess(id);
  appendLog(id, { timestamp: new Date().toISOString(), stream: "system", level: "info", message: "Sandbox stopped", phase: "stop" });

  sandbox.status = "STOPPED";
  sandbox.pid = undefined;
  sandbox.updatedAt = new Date().toISOString();
  saveSandbox(sandbox);
  return sandbox;
}

export async function restartSandbox(id: string): Promise<PreviewSandbox | undefined> {
  const existing = getSandbox(id);
  if (!existing) return undefined;

  await stopSandbox(id);
  return startSandbox({
    missionId: existing.missionId,
    outputId: existing.outputId,
    factoryProjectId: existing.projectId,
    projectKind: existing.projectKind,
  });
}

export async function cleanupSandbox(id: string, fullRemove = false): Promise<PreviewSandbox | undefined> {
  const sandbox = getSandbox(id);
  if (!sandbox) return undefined;

  await stopSandbox(id);
  await cleanupWorkspace(sandbox.workspaceDir, !fullRemove);
  appendLog(id, { timestamp: new Date().toISOString(), stream: "system", level: "info", message: fullRemove ? "Workspace removed" : "node_modules/.next cleaned", phase: "cleanup" });

  if (fullRemove) {
    sandbox.status = "EXPIRED";
  }
  saveSandbox(sandbox);
  return sandbox;
}

export function getSandboxLogs(id: string, offset = 0, limit = 100): PaginatedLogs | null {
  if (!getSandbox(id)) return null;
  return getLogs(id, offset, limit);
}

export function getSandboxes(filter?: SandboxListFilter): PreviewSandbox[] {
  return listSandboxes(filter);
}

export function monitorSandboxResources(id: string): PreviewSandbox | undefined {
  const sandbox = getSandbox(id);
  if (!sandbox) return undefined;

  sandbox.resources.elapsedMs = Date.now() - new Date(sandbox.createdAt).getTime();
  const check = checkResourceLimits(sandbox.resources, DEFAULT_RESOURCE_LIMITS);
  if (check.exceeded) {
    sandbox.limitsExceeded = true;
    sandbox.error = check.reason;
    appendLog(id, { timestamp: new Date().toISOString(), stream: "system", level: "error", message: `Limit exceeded: ${check.reason}`, phase: "limits" });
    stopSandbox(id);
  }
  saveSandbox(sandbox);
  return sandbox;
}
