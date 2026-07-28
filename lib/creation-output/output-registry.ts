/** PROGRAM 5350 — Output registry (mission ↔ outputs index). */

import type {
  CreationOutput,
  CreationOutputSummaryCard,
  CreationOutputType,
  MissionOutputSummary,
  StudioSnapshot,
} from "./types";
import {
  ALL_OUTPUT_TYPES,
  OUTPUT_TYPE_ICONS,
  OUTPUT_TYPE_LABELS,
} from "./types";
import { getOutputRepository } from "./output-repository";

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createOutputId(type: CreationOutputType): string {
  const short = type.replace("_OUTPUT", "").toLowerCase();
  return generateId(`out-${short}`);
}

export function getLatestOutputByType(
  missionId: string,
  type: CreationOutputType
): CreationOutput | null {
  const versions = getOutputRepository().findByMissionAndType(missionId, type);
  return versions[0] ?? null;
}

export function getAllLatestOutputs(missionId: string): CreationOutput[] {
  return ALL_OUTPUT_TYPES.map((type) => getLatestOutputByType(missionId, type)).filter(
    (o): o is CreationOutput => o !== null
  );
}

export function getOutputVersions(missionId: string, type: CreationOutputType): CreationOutput[] {
  return getOutputRepository().findByMissionAndType(missionId, type);
}

export function registerOutput(output: CreationOutput): CreationOutput {
  getOutputRepository().save(output);
  return output;
}

export function registerOutputs(outputs: CreationOutput[]): CreationOutput[] {
  getOutputRepository().saveAll(outputs);
  return outputs;
}

export function buildMissionOutputSummary(
  missionId: string,
  ventureSlug?: string,
  ventureId?: string
): MissionOutputSummary {
  const cards: CreationOutputSummaryCard[] = ALL_OUTPUT_TYPES.map((type) => {
    const latest = getLatestOutputByType(missionId, type);
    return {
      type,
      label: OUTPUT_TYPE_LABELS[type],
      icon: OUTPUT_TYPE_ICONS[type],
      outputId: latest?.outputId,
      status: latest?.status ?? "DRAFT",
      version: latest?.version ?? "—",
      lastUpdated: latest?.updatedAt ?? new Date().toISOString(),
      studioHref: `/studio/${missionId}?type=${type}`,
    };
  });

  const lastUpdated = cards.reduce(
    (max, c) => (c.lastUpdated > max ? c.lastUpdated : max),
    new Date(0).toISOString()
  );

  return { missionId, ventureId, ventureSlug, outputs: cards, lastUpdated };
}

export function buildStudioSnapshot(
  missionId: string,
  ventureSlug?: string,
  selectedOutputId?: string
): StudioSnapshot {
  const repo = getOutputRepository();
  const outputs = repo.findByMission(missionId);
  const selected =
    selectedOutputId ?? outputs[0]?.outputId ?? getAllLatestOutputs(missionId)[0]?.outputId;

  const selectedOutput = selected ? repo.findById(selected) : null;

  return {
    missionId,
    ventureSlug,
    outputs,
    changeRequests: repo.getChangeRequests(missionId),
    comparisons: repo.getComparisons(missionId),
    selectedOutputId: selected,
    selectedVersion: selectedOutput?.version,
  };
}

export function hasAnyOutputs(missionId: string): boolean {
  return getOutputRepository().findByMission(missionId).length > 0;
}
