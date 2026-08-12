/**
 * PROGRAM 6050 — Build Registry
 * Each compile attempt creates an immutable Build — never overwrite failed with success.
 */

import type { CanonicalBuild, BuildResult, ValidationSummary } from "../types";
import { deliveryId } from "../ids";

export class BuildImmutabilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BuildImmutabilityError";
  }
}

export interface BuildRegistry {
  /** Append-only create. Never mutates an existing completed build. */
  record(build: CanonicalBuild): CanonicalBuild;
  get(buildId: string): CanonicalBuild | undefined;
  listByMission(missionId: string): CanonicalBuild[];
  listByCodebase(codebaseId: string): CanonicalBuild[];
  /** Complete a PENDING/RUNNING build in place once — then frozen. */
  complete(
    buildId: string,
    result: Exclude<BuildResult, "PENDING" | "RUNNING">,
    patch?: {
      logsRef?: string;
      validation?: ValidationSummary;
      durationMs?: number;
      resourceUse?: CanonicalBuild["resourceUse"];
    }
  ): CanonicalBuild;
}

export function createBuildRegistry(): BuildRegistry {
  const store = new Map<string, CanonicalBuild>();
  const missionIndex = new Map<string, string[]>();

  function index(b: CanonicalBuild): void {
    store.set(b.buildId, b);
    const ids = missionIndex.get(b.missionId) ?? [];
    if (!ids.includes(b.buildId)) {
      missionIndex.set(b.missionId, [...ids, b.buildId]);
    }
  }

  return {
    record(build) {
      if (store.has(build.buildId)) {
        throw new BuildImmutabilityError(
          `Build ${build.buildId} already exists — create a new buildId; never overwrite`
        );
      }
      const frozen: CanonicalBuild = { ...build, immutable: true };
      index(frozen);
      return frozen;
    },

    get(buildId) {
      return store.get(buildId);
    },

    listByMission(missionId) {
      return (missionIndex.get(missionId) ?? [])
        .map((id) => store.get(id))
        .filter(Boolean) as CanonicalBuild[];
    },

    listByCodebase(codebaseId) {
      return Array.from(store.values()).filter((b) => b.codebaseId === codebaseId);
    },

    complete(buildId, result, patch) {
      const existing = store.get(buildId);
      if (!existing) {
        throw new BuildImmutabilityError(`Build ${buildId} not found`);
      }
      if (existing.result !== "PENDING" && existing.result !== "RUNNING") {
        throw new BuildImmutabilityError(
          `Build ${buildId} already completed as ${existing.result} — immutable; record a new build`
        );
      }
      const completed: CanonicalBuild = {
        ...existing,
        result,
        logsRef: patch?.logsRef ?? existing.logsRef,
        validation: patch?.validation ?? existing.validation,
        durationMs: patch?.durationMs ?? existing.durationMs,
        resourceUse: patch?.resourceUse ?? existing.resourceUse,
        completedAt: new Date().toISOString(),
        immutable: true,
      };
      store.set(buildId, completed);
      return completed;
    },
  };
}

export function startBuild(input: {
  missionId: string;
  codebaseId: string;
  codebaseVersion: string;
  environment: string;
  commands: string[];
  buildId?: string;
}): CanonicalBuild {
  return {
    buildId: input.buildId ?? deliveryId("bld"),
    missionId: input.missionId,
    codebaseId: input.codebaseId,
    codebaseVersion: input.codebaseVersion,
    environment: input.environment,
    commands: input.commands,
    result: "RUNNING",
    createdAt: new Date().toISOString(),
    immutable: true,
  };
}

export function isSuccessfulBuild(build: CanonicalBuild): boolean {
  return build.result === "SUCCESS";
}
