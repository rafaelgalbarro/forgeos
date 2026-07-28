/** PROGRAM 5360 — File builder. */

import { buildCodeFile } from "./code-project";
import type { CodeFile, GenerationMode } from "./types";

export interface FileBuildInput {
  path: string;
  content: string;
  purpose: string;
  generatedBy?: GenerationMode;
  sourceArtifactIds?: string[];
}

export function buildFiles(inputs: FileBuildInput[]): CodeFile[] {
  return inputs.map((input) =>
    buildCodeFile(input.path, input.content, input.purpose, {
      generatedBy: input.generatedBy,
      sourceArtifactIds: input.sourceArtifactIds,
    })
  );
}

export function mergeFiles(existing: CodeFile[], updates: CodeFile[]): CodeFile[] {
  const map = new Map(existing.map((f) => [f.path, f]));
  for (const f of updates) map.set(f.path, f);
  return Array.from(map.values()).sort((a, b) => a.path.localeCompare(b.path));
}
