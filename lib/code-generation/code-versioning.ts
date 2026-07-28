/** PROGRAM 5360 — Code project versioning. */

import type { CodeFile, CodeProject, CodeVersionComparison } from "./types";
import { bumpProjectVersion, computeChecksum, createProjectId } from "./code-project";

export function createNewCodeVersion(
  project: CodeProject,
  updates: Partial<Pick<CodeProject, "files" | "warnings" | "status">> & {
    changeDescription?: string;
  }
): CodeProject {
  const now = new Date().toISOString();
  return {
    ...project,
    projectId: createProjectId(project.projectType),
    previousVersionId: project.projectId,
    version: bumpProjectVersion(project.version),
    files: updates.files ?? project.files,
    warnings: updates.warnings ?? project.warnings,
    status: updates.status ?? "GENERATED",
    updatedAt: now,
    validation: undefined,
  };
}

export function compareCodeVersions(a: CodeProject, b: CodeProject): CodeVersionComparison {
  const pathsA = new Set(a.files.map((f) => f.path));
  const pathsB = new Set(b.files.map((f) => f.path));

  const addedFiles = [...pathsB].filter((p) => !pathsA.has(p));
  const removedFiles = [...pathsA].filter((p) => !pathsB.has(p));
  const changedFiles: string[] = [];

  for (const path of [...pathsA].filter((p) => pathsB.has(p))) {
    const fileA = a.files.find((f) => f.path === path)!;
    const fileB = b.files.find((f) => f.path === path)!;
    if (fileA.checksum !== fileB.checksum) changedFiles.push(path);
  }

  return {
    projectId: b.projectId,
    versionA: a.version,
    versionB: b.version,
    affectedFiles: [...addedFiles, ...removedFiles, ...changedFiles],
    addedFiles,
    removedFiles,
    changedFiles,
    validationBefore: a.validation?.result,
    validationAfter: b.validation?.result,
  };
}

export function diffFileContent(a: CodeFile, b: CodeFile): string[] {
  const linesA = a.content.split("\n");
  const linesB = b.content.split("\n");
  const diff: string[] = [];
  const max = Math.max(linesA.length, linesB.length);

  for (let i = 0; i < max; i++) {
    const la = linesA[i];
    const lb = linesB[i];
    if (la !== lb) {
      if (la !== undefined) diff.push(`- ${la}`);
      if (lb !== undefined) diff.push(`+ ${lb}`);
    }
  }
  return diff;
}

export function updateFileInProject(
  project: CodeProject,
  path: string,
  newContent: string
): CodeProject {
  const files = project.files.map((f) =>
    f.path === path
      ? { ...f, content: newContent, checksum: computeChecksum(newContent), updatedAt: undefined }
      : f
  );
  return { ...project, files, updatedAt: new Date().toISOString() };
}
