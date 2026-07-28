/** PROGRAM 6050 — Output Registry V2 */

import type { CanonicalOutput, OutputKind, OutputStatus } from "../types";
import { deliveryId } from "../ids";

export interface OutputRepository {
  save(output: CanonicalOutput): void;
  get(outputId: string): CanonicalOutput | undefined;
  listByMission(missionId: string): CanonicalOutput[];
  listByKind(missionId: string, kind: OutputKind): CanonicalOutput[];
}

export function createOutputRepository(): OutputRepository {
  const store = new Map<string, CanonicalOutput>();
  const missionIndex = new Map<string, string[]>();

  return {
    save(output) {
      store.set(output.outputId, output);
      const ids = missionIndex.get(output.missionId) ?? [];
      if (!ids.includes(output.outputId)) {
        missionIndex.set(output.missionId, [...ids, output.outputId]);
      }
    },
    get(outputId) {
      return store.get(outputId);
    },
    listByMission(missionId) {
      return (missionIndex.get(missionId) ?? [])
        .map((id) => store.get(id))
        .filter(Boolean) as CanonicalOutput[];
    },
    listByKind(missionId, kind) {
      return this.listByMission(missionId).filter((o) => o.kind === kind);
    },
  };
}

export class OutputQueryService {
  constructor(private readonly repo: OutputRepository) {}

  latestByKind(missionId: string, kind: OutputKind): CanonicalOutput | undefined {
    return this.repo
      .listByKind(missionId, kind)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  }

  list(missionId: string, filter?: { kind?: OutputKind; status?: OutputStatus }) {
    let items = this.repo.listByMission(missionId);
    if (filter?.kind) items = items.filter((o) => o.kind === filter.kind);
    if (filter?.status) items = items.filter((o) => o.status === filter.status);
    return items;
  }
}

export function createCanonicalOutput(
  input: Omit<CanonicalOutput, "outputId" | "createdAt" | "updatedAt" | "approvals" | "sourceArtifactIds"> &
    Partial<Pick<CanonicalOutput, "outputId" | "approvals" | "sourceArtifactIds">>
): CanonicalOutput {
  const now = new Date().toISOString();
  return {
    outputId: input.outputId ?? deliveryId("out"),
    missionId: input.missionId,
    ventureId: input.ventureId,
    kind: input.kind,
    title: input.title,
    status: input.status,
    version: input.version,
    sourceArtifactIds: input.sourceArtifactIds ?? [],
    previewMode: input.previewMode,
    previewUrl: input.previewUrl,
    validation: input.validation,
    approvals: input.approvals ?? [],
    payload: input.payload,
    createdAt: now,
    updatedAt: now,
    legacySource: input.legacySource,
    previousVersionId: input.previousVersionId,
  };
}
