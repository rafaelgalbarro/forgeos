/** PROGRAM 6050 — Artifact Registry V2 */

import type { CanonicalArtifact, ArtifactKind, ArtifactStatus } from "../types";
import { deliveryId } from "../ids";

export interface ArtifactRepository {
  save(artifact: CanonicalArtifact): void;
  get(artifactId: string): CanonicalArtifact | undefined;
  listByMission(missionId: string): CanonicalArtifact[];
  listByKind(missionId: string, kind: ArtifactKind): CanonicalArtifact[];
  deleteLogical(artifactId: string): void;
}

export function createArtifactRepository(): ArtifactRepository {
  const store = new Map<string, CanonicalArtifact>();
  const missionIndex = new Map<string, string[]>();

  function index(a: CanonicalArtifact): void {
    store.set(a.artifactId, a);
    const ids = missionIndex.get(a.missionId) ?? [];
    if (!ids.includes(a.artifactId)) {
      missionIndex.set(a.missionId, [...ids, a.artifactId]);
    }
  }

  return {
    save(artifact) {
      index(artifact);
    },
    get(artifactId) {
      return store.get(artifactId);
    },
    listByMission(missionId) {
      return (missionIndex.get(missionId) ?? [])
        .map((id) => store.get(id))
        .filter(Boolean) as CanonicalArtifact[];
    },
    listByKind(missionId, kind) {
      return this.listByMission(missionId).filter((a) => a.kind === kind);
    },
    deleteLogical(artifactId) {
      const a = store.get(artifactId);
      if (!a) return;
      store.set(artifactId, {
        ...a,
        status: "ARCHIVED",
        updatedAt: new Date().toISOString(),
      });
    },
  };
}

export class ArtifactQueryService {
  constructor(private readonly repo: ArtifactRepository) {}

  get(artifactId: string): CanonicalArtifact | undefined {
    return this.repo.get(artifactId);
  }

  list(missionId: string, filter?: { kind?: ArtifactKind; status?: ArtifactStatus }) {
    let items = this.repo.listByMission(missionId);
    if (filter?.kind) items = items.filter((a) => a.kind === filter.kind);
    if (filter?.status) items = items.filter((a) => a.status === filter.status);
    return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  latestByKind(missionId: string, kind: ArtifactKind): CanonicalArtifact | undefined {
    return this.list(missionId, { kind }).find((a) => a.status !== "ARCHIVED" && a.status !== "SUPERSEDED");
  }
}

export class ArtifactDependencyResolver {
  constructor(private readonly repo: ArtifactRepository) {}

  resolveDeps(artifactId: string): CanonicalArtifact[] {
    const root = this.repo.get(artifactId);
    if (!root) return [];
    const seen = new Set<string>();
    const out: CanonicalArtifact[] = [];
    const walk = (id: string) => {
      if (seen.has(id)) return;
      seen.add(id);
      const a = this.repo.get(id);
      if (!a) return;
      out.push(a);
      for (const dep of a.dependencyIds) walk(dep);
    };
    for (const dep of root.dependencyIds) walk(dep);
    return out;
  }

  dependents(artifactId: string, missionId: string): CanonicalArtifact[] {
    return this.repo.listByMission(missionId).filter((a) => a.dependencyIds.includes(artifactId));
  }

  hasCycle(artifactId: string): boolean {
    const visiting = new Set<string>();
    const visited = new Set<string>();
    const dfs = (id: string): boolean => {
      if (visiting.has(id)) return true;
      if (visited.has(id)) return false;
      visiting.add(id);
      const a = this.repo.get(id);
      for (const dep of a?.dependencyIds ?? []) {
        if (dfs(dep)) return true;
      }
      visiting.delete(id);
      visited.add(id);
      return false;
    };
    return dfs(artifactId);
  }
}

export class ArtifactVersionService {
  constructor(private readonly repo: ArtifactRepository) {}

  createVersion(
    previous: CanonicalArtifact,
    patch: Partial<Pick<CanonicalArtifact, "title" | "contentRef" | "checksum" | "metadata" | "status">>
  ): CanonicalArtifact {
    const next: CanonicalArtifact = {
      ...previous,
      ...patch,
      artifactId: deliveryId("art"),
      version: bumpPatch(previous.version),
      previousVersionId: previous.artifactId,
      status: patch.status ?? "DRAFT",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.repo.save({
      ...previous,
      status: "SUPERSEDED",
      updatedAt: new Date().toISOString(),
    });
    this.repo.save(next);
    return next;
  }

  history(missionId: string, title: string): CanonicalArtifact[] {
    return this.repo
      .listByMission(missionId)
      .filter((a) => a.title === title)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }
}

export function createArtifact(
  input: Omit<CanonicalArtifact, "artifactId" | "createdAt" | "updatedAt" | "dependencyIds" | "sourceKnowledgeIds" | "metadata"> &
    Partial<Pick<CanonicalArtifact, "dependencyIds" | "sourceKnowledgeIds" | "metadata" | "artifactId">>
): CanonicalArtifact {
  const now = new Date().toISOString();
  return {
    artifactId: input.artifactId ?? deliveryId("art"),
    missionId: input.missionId,
    ventureId: input.ventureId,
    kind: input.kind,
    title: input.title,
    status: input.status,
    version: input.version,
    contentRef: input.contentRef,
    dependencyIds: input.dependencyIds ?? [],
    sourceKnowledgeIds: input.sourceKnowledgeIds ?? [],
    checksum: input.checksum,
    createdAt: now,
    updatedAt: now,
    metadata: input.metadata ?? {},
    legacySource: input.legacySource,
    previousVersionId: input.previousVersionId,
  };
}

function bumpPatch(version: string): string {
  const parts = version.split(".").map(Number);
  if (parts.length === 3 && parts.every((n) => !Number.isNaN(n))) {
    return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
  }
  return `${version}.1`;
}
