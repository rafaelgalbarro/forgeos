/**
 * Shared `.forgeos/cache` for PM2 crypto engine and Next.js on the same host.
 * Default on Windows deploy: %LOCALAPPDATA%\\forgeos-node\\.forgeos\\cache
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** Override with FORGEOS_CACHE_DIR; else FORGEOS_ROOT/.forgeos/cache or LocalAppData forgeos-node. */
export function resolveForgeosCacheDir(): string {
  const explicit = process.env.FORGEOS_CACHE_DIR?.trim();
  if (explicit) return explicit;

  const root = process.env.FORGEOS_ROOT?.trim();
  if (root) return path.join(root, ".forgeos", "cache");

  const local =
    process.env.LOCALAPPDATA?.trim() ||
    (process.platform === "win32"
      ? path.join(os.homedir(), "AppData", "Local")
      : "");
  if (local) {
    const deployRoot = path.join(local, "forgeos-node");
    if (fs.existsSync(deployRoot)) {
      return path.join(deployRoot, ".forgeos", "cache");
    }
  }

  return path.join(process.cwd(), ".forgeos", "cache");
}

export function forgeosCacheFile(name: string): string {
  return path.join(resolveForgeosCacheDir(), name);
}
