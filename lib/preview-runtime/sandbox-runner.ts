/** PROGRAM 5370 — Sandbox process runner (child_process.spawn). */

import { spawn, type ChildProcess } from "child_process";
import path from "path";
import fs from "fs/promises";
import os from "os";
import type { CodeProject } from "@/lib/code-generation/types";
import type { CodeProjectLegacyManifest } from "@/lib/code-generation/legacy-adapter";
import { withLegacyManifest } from "@/lib/code-generation/legacy-adapter";
import { buildAllowedArgv, isCommandAllowed } from "./security/command-allowlist";
import { isPathInsideSandbox, sanitizeRelativePath } from "./security/path-guard";
import { isEnvVarAllowed } from "./security/network-policy";
import { appendLog } from "./sandbox-store";
import type { PreviewSandbox } from "./types";

const activeProcesses = new Map<string, ChildProcess>();

export async function createWorkspace(sandboxId: string): Promise<string> {
  const dir = path.join(os.tmpdir(), `forgeos-sandbox-${sandboxId}`);
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function writeProjectFiles(workspaceDir: string, project: CodeProject): Promise<void> {
  const fullProject = withLegacyManifest(project);
  for (const dir of fullProject.directories ?? []) {
    const rel = sanitizeRelativePath(dir.path);
    const full = path.join(workspaceDir, rel);
    if (!isPathInsideSandbox(workspaceDir, full)) continue;
    await fs.mkdir(full, { recursive: true });
  }
  for (const file of fullProject.files) {
    const rel = sanitizeRelativePath(file.path);
    const full = path.join(workspaceDir, rel);
    if (!isPathInsideSandbox(workspaceDir, full)) {
      throw new Error(`Path guard blocked: ${file.path}`);
    }
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, file.content, "utf8");
  }
}

export function buildSandboxEnv(manifest: CodeProjectLegacyManifest, port?: number): Record<string, string> {
  const env: Record<string, string> = {
    NODE_ENV: "development",
    PREVIEW_MODE: "true",
    ENABLE_REAL_EXECUTION: "false",
    ENABLE_REAL_AI: "false",
    FORCE_COLOR: "0",
  };

  for (const v of manifest.envVars) {
    if (isEnvVarAllowed(v.key)) {
      env[v.key] = v.key === "PORT" && port ? String(port) : v.value;
    }
  }

  if (port) env.PORT = String(port);
  return env;
}

export interface RunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

export function runCommand(
  sandboxId: string,
  workspaceDir: string,
  program: string,
  args: string[],
  env: Record<string, string>,
  timeoutMs: number,
  phase: string,
  declaredTests?: string[]
): Promise<RunResult> {
  if (!isCommandAllowed(program, args, declaredTests)) {
    throw new Error(`Command not allowed: ${program} ${args.join(" ")}`);
  }

  const start = Date.now();
  let stdout = "";
  let stderr = "";

  return new Promise((resolve, reject) => {
    const useShell = process.platform === "win32" && /\.(cmd|bat)$/i.test(program);
    const proc = spawn(program, args, {
      cwd: workspaceDir,
      env: { ...process.env, ...env },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      shell: useShell,
    });

    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      reject(new Error(`Command timeout after ${timeoutMs}ms`));
    }, timeoutMs);

    proc.stdout?.on("data", (d: Buffer) => {
      const text = d.toString();
      stdout += text;
      for (const line of text.split(/\r?\n/).filter(Boolean)) {
        appendLog(sandboxId, { timestamp: new Date().toISOString(), stream: "stdout", level: "info", message: line, phase });
      }
    });

    proc.stderr?.on("data", (d: Buffer) => {
      const text = d.toString();
      stderr += text;
      for (const line of text.split(/\r?\n/).filter(Boolean)) {
        appendLog(sandboxId, { timestamp: new Date().toISOString(), stream: "stderr", level: "warn", message: line, phase });
      }
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({ exitCode: code ?? 1, stdout, stderr, durationMs: Date.now() - start });
    });
  });
}

export async function runInstall(sandbox: PreviewSandbox, project: ReturnType<typeof withLegacyManifest>): Promise<RunResult> {
  const cmd = buildAllowedArgv("install");
  if (!cmd) throw new Error("Install command not configured");
  const env = buildSandboxEnv(project.manifest, sandbox.port);
  return runCommand(sandbox.id, sandbox.workspaceDir, cmd.program, cmd.args, env, 180_000, "install", project.manifest.declaredTests);
}

export async function runBuild(sandbox: PreviewSandbox, project: ReturnType<typeof withLegacyManifest>): Promise<RunResult> {
  if (project.manifest.kind === "mobile") {
    return { exitCode: 0, stdout: "Mobile build skipped — preview plan mode", stderr: "", durationMs: 0 };
  }
  const cmd = buildAllowedArgv("build");
  if (!cmd) throw new Error("Build command not configured");
  const env = buildSandboxEnv(project.manifest, sandbox.port);
  return runCommand(sandbox.id, sandbox.workspaceDir, cmd.program, cmd.args, env, 300_000, "build", project.manifest.declaredTests);
}

export function startPreviewServer(
  sandbox: PreviewSandbox,
  project: ReturnType<typeof withLegacyManifest>
): ChildProcess {
  const env = buildSandboxEnv(project.manifest, sandbox.port);
  let program: string;
  let args: string[];

  if (project.manifest.framework === "express") {
    program = process.platform === "win32" ? "npx.cmd" : "npx";
    args = ["tsx", "src/server.ts"];
  } else if (project.manifest.framework === "expo") {
    program = process.platform === "win32" ? "npx.cmd" : "npx";
    args = ["expo", "start", "--localhost"];
  } else {
    const cmd = buildAllowedArgv("dev", sandbox.port);
    if (!cmd) throw new Error("Dev command not configured");
    program = cmd.program;
    args = cmd.args;
  }

  if (!isCommandAllowed(program, args, project.manifest.declaredTests)) {
    throw new Error(`Start command not allowed: ${program} ${args.join(" ")}`);
  }

  const proc = spawn(program, args, {
    cwd: sandbox.workspaceDir,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
    shell: process.platform === "win32" && /\.(cmd|bat)$/i.test(program),
    detached: false,
  });

  activeProcesses.set(sandbox.id, proc);

  proc.stdout?.on("data", (d: Buffer) => {
    for (const line of d.toString().split(/\r?\n/).filter(Boolean)) {
      appendLog(sandbox.id, { timestamp: new Date().toISOString(), stream: "stdout", level: "info", message: line, phase: "runtime" });
    }
  });

  proc.stderr?.on("data", (d: Buffer) => {
    for (const line of d.toString().split(/\r?\n/).filter(Boolean)) {
      appendLog(sandbox.id, { timestamp: new Date().toISOString(), stream: "stderr", level: "warn", message: line, phase: "runtime" });
    }
  });

  return proc;
}

export function stopProcess(sandboxId: string): boolean {
  const proc = activeProcesses.get(sandboxId);
  if (!proc) return false;
  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(proc.pid), "/f", "/t"], { windowsHide: true });
    } else {
      proc.kill("SIGTERM");
    }
  } catch {
    proc.kill("SIGKILL");
  }
  activeProcesses.delete(sandboxId);
  return true;
}

export async function cleanupWorkspace(workspaceDir: string, keepLogs = true): Promise<void> {
  try {
    if (!keepLogs) {
      await fs.rm(workspaceDir, { recursive: true, force: true });
      return;
    }
    const nm = path.join(workspaceDir, "node_modules");
    const next = path.join(workspaceDir, ".next");
    await fs.rm(nm, { recursive: true, force: true }).catch(() => {});
    await fs.rm(next, { recursive: true, force: true }).catch(() => {});
  } catch {
    /* best effort */
  }
}

export function getActiveProcessCount(): number {
  return activeProcesses.size;
}
