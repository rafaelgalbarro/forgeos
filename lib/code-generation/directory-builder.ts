/** PROGRAM 5360 — Directory builder. */

import type { CodeDirectory, CodeFile } from "./types";
import { extractDirectories } from "./code-project";

export function buildDirectoriesFromFiles(files: CodeFile[]): CodeDirectory[] {
  return extractDirectories(files);
}

export function ensureDirectoryPaths(paths: string[]): CodeDirectory[] {
  return paths.map((path) => ({ path, purpose: `Directory: ${path}` }));
}
