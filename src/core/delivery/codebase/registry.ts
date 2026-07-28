/** PROGRAM 6050 — Codebase Registry */

import type { CanonicalCodebase, CodebaseStatus } from "../types";
import { deliveryId } from "../ids";

export interface CodebaseRepository {
  save(codebase: CanonicalCodebase): void;
  get(codebaseId: string): CanonicalCodebase | undefined;
  listByMission(missionId: string): CanonicalCodebase[];
  listByOutput(outputId: string): CanonicalCodebase[];
}

export function createCodebaseRepository(): CodebaseRepository {
  const store = new Map<string, CanonicalCodebase>();
  const missionIndex = new Map<string, string[]>();

  return {
    save(codebase) {
      store.set(codebase.codebaseId, codebase);
      const ids = missionIndex.get(codebase.missionId) ?? [];
      if (!ids.includes(codebase.codebaseId)) {
        missionIndex.set(codebase.missionId, [...ids, codebase.codebaseId]);
      }
    },
    get(codebaseId) {
      return store.get(codebaseId);
    },
    listByMission(missionId) {
      return (missionIndex.get(missionId) ?? [])
        .map((id) => store.get(id))
        .filter(Boolean) as CanonicalCodebase[];
    },
    listByOutput(outputId) {
      return Array.from(store.values()).filter((c) => c.outputId === outputId);
    },
  };
}

export function createCanonicalCodebase(
  input: Omit<CanonicalCodebase, "codebaseId" | "createdAt" | "updatedAt" | "checksums" | "sourceArtifactIds"> &
    Partial<Pick<CanonicalCodebase, "codebaseId" | "checksums" | "sourceArtifactIds">>
): CanonicalCodebase {
  const now = new Date().toISOString();
  const checksums: Record<string, string> = { ...(input.checksums ?? {}) };
  for (const f of input.files) {
    checksums[f.path] = f.checksum;
  }
  return {
    codebaseId: input.codebaseId ?? deliveryId("cb"),
    missionId: input.missionId,
    ventureId: input.ventureId,
    outputId: input.outputId,
    name: input.name,
    slug: input.slug,
    version: input.version,
    status: input.status,
    framework: input.framework,
    language: input.language,
    packageManager: input.packageManager,
    templateId: input.templateId,
    files: input.files,
    directories: input.directories,
    dependencies: input.dependencies,
    scripts: input.scripts,
    environmentVariables: input.environmentVariables,
    sourceArtifactIds: input.sourceArtifactIds ?? [],
    validation: input.validation,
    checksums,
    createdAt: now,
    updatedAt: now,
    legacySource: input.legacySource,
    previousVersionId: input.previousVersionId,
  };
}

export function isCodebaseReady(status: CodebaseStatus): boolean {
  return status === "READY_FOR_PREVIEW" || status === "APPROVED" || status === "GENERATED";
}
