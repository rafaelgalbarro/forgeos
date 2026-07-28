/**
 * PROGRAM 6050 — CodeProject → Canonical Codebase adapter (non-destructive).
 * Preserves files, templates, deps, scripts, env specs, source artifact IDs, checksums, validation.
 */

import type { CodeProject } from "@/lib/code-generation/types";
import type { CanonicalCodebase } from "../types";
import { createCanonicalCodebase } from "./registry";

export function adaptCodeProject(project: CodeProject): CanonicalCodebase {
  const sourceArtifactIds = Array.from(
    new Set(project.files.flatMap((f) => f.sourceArtifactIds ?? []))
  );

  return createCanonicalCodebase({
    codebaseId: `can-cb-${project.projectId}`,
    missionId: project.missionId,
    ventureId: project.ventureId,
    outputId: project.outputId,
    name: project.name,
    slug: project.slug,
    version: project.version,
    status: project.status as CanonicalCodebase["status"],
    framework: project.framework,
    language: project.language,
    packageManager: project.packageManager,
    templateId: project.templateId,
    files: project.files.map((f) => ({
      path: f.path,
      language: f.language,
      content: f.content,
      purpose: f.purpose,
      checksum: f.checksum,
      sourceArtifactIds: f.sourceArtifactIds ?? [],
      sizeBytes: f.sizeBytes,
    })),
    directories: project.directories,
    dependencies: project.dependencies,
    scripts: project.scripts,
    environmentVariables: project.environmentVariables,
    sourceArtifactIds,
    validation: project.validation
      ? {
          passed: project.validation.passed,
          score: project.validation.score,
          checks: project.validation.checks,
          validatedAt: project.validation.validatedAt,
        }
      : undefined,
    checksums: Object.fromEntries(project.files.map((f) => [f.path, f.checksum])),
    legacySource: { system: "code-generation", id: project.projectId },
    previousVersionId: project.previousVersionId
      ? `can-cb-${project.previousVersionId}`
      : undefined,
  });
}

export function adaptCodeProjects(projects: CodeProject[]): CanonicalCodebase[] {
  return projects.map(adaptCodeProject);
}

/** Do not generate new code when a valid codebase already exists. */
export function shouldReuseCodebase(existing: CanonicalCodebase | undefined): boolean {
  if (!existing) return false;
  if (existing.status === "FAILED" || existing.status === "INVALID") return false;
  return existing.files.length > 0 && Object.keys(existing.checksums).length > 0;
}
