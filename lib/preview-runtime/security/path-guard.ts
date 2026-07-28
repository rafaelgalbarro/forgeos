/** PROGRAM 5370 — Sandbox path guard — no access outside workspace. */

import path from "path";

export function resolveSandboxPath(sandboxDir: string, relativePath: string): string | null {
  const normalized = path.normalize(path.join(sandboxDir, relativePath));
  const sandboxRoot = path.normalize(sandboxDir + path.sep);
  if (!normalized.startsWith(sandboxRoot) && normalized !== path.normalize(sandboxDir)) {
    return null;
  }
  return normalized;
}

export function isPathInsideSandbox(sandboxDir: string, targetPath: string): boolean {
  const normalized = path.normalize(targetPath);
  const sandboxRoot = path.normalize(sandboxDir + path.sep);
  return normalized.startsWith(sandboxRoot) || normalized === path.normalize(sandboxDir);
}

export function sanitizeRelativePath(filePath: string): string {
  return filePath.replace(/^(\.\.(\/|\\|$))+/, "").replace(/^[\/\\]+/, "");
}

export const FORGEOS_BLOCKED_PATHS = [
  ".env.local",
  ".env.production",
  "node_modules",
];

export function shouldBlockCopy(sourcePath: string): boolean {
  const base = path.basename(sourcePath);
  return FORGEOS_BLOCKED_PATHS.includes(base);
}
