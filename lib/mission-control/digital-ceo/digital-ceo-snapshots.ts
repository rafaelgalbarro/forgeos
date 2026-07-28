/** Lightweight SSR snapshot for Digital CEO. */

import { DIGITAL_CEO_VERSION } from "./types";

export interface DigitalCEOSnapshot {
  version: typeof DIGITAL_CEO_VERSION;
  missionId: string;
  generatedAt: string | null;
  briefCount: number;
  readyCount: number;
  hasMorningBriefToday: boolean;
  labels: {
    morningBrief: string;
    missionBrief: string;
    ceoBrief: string;
    dailyPriorities: string;
    weeklyReview: string;
    executiveDigest: string;
  };
}

export function buildEmptyDigitalCEOSnapshot(missionId: string): DigitalCEOSnapshot {
  return {
    version: DIGITAL_CEO_VERSION,
    missionId,
    generatedAt: null,
    briefCount: 6,
    readyCount: 0,
    hasMorningBriefToday: false,
    labels: {
      morningBrief: "Morning Brief",
      missionBrief: "Mission Brief",
      ceoBrief: "CEO Brief",
      dailyPriorities: "Prioridades del día",
      weeklyReview: "Revisión semanal",
      executiveDigest: "Digest ejecutivo",
    },
  };
}

export function buildDigitalCEOSnapshotFromState(
  missionId: string,
  hasMorningBriefToday: boolean,
  readyCount: number
): DigitalCEOSnapshot {
  return {
    version: DIGITAL_CEO_VERSION,
    missionId,
    generatedAt: new Date().toISOString(),
    briefCount: 6,
    readyCount,
    hasMorningBriefToday,
    labels: {
      morningBrief: "Morning Brief",
      missionBrief: "Mission Brief",
      ceoBrief: "CEO Brief",
      dailyPriorities: "Prioridades del día",
      weeklyReview: "Revisión semanal",
      executiveDigest: "Digest ejecutivo",
    },
  };
}

export function digitalCEOSnapshotSummary(snapshot: DigitalCEOSnapshot): string {
  if (!snapshot.generatedAt) return "CEO Digital pendiente de activación";
  return `${snapshot.readyCount}/${snapshot.briefCount} briefs listos`;
}
