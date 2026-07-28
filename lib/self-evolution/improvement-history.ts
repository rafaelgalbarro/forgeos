/** Program 2035 — Improvement history tracking. */

import type { ImprovementHistoryEntry, ImprovementProposal, ObservationSignal } from "./types";

const NOW = () => new Date().toISOString();

export function buildHistory(
  observations: ObservationSignal[],
  proposals: ImprovementProposal[]
): ImprovementHistoryEntry[] {
  const entries: ImprovementHistoryEntry[] = [];

  observations.slice(0, 4).forEach((obs, i) => {
    entries.push({
      id: `hist-detect-${i}`,
      proposalId: proposals[i]?.id ?? obs.id,
      action: "detected",
      timestamp: obs.detectedAt,
      actor: "observation-engine",
      notes: obs.title,
    });
  });

  proposals.forEach((p, i) => {
    entries.push({
      id: `hist-propose-${i}`,
      proposalId: p.id,
      action: "proposed",
      timestamp: p.createdAt,
      actor: "proposal-engine",
      notes: p.title,
    });
  });

  if (proposals[0]) {
    entries.push({
      id: "hist-review-0",
      proposalId: proposals[0].id,
      action: "approved",
      timestamp: NOW(),
      actor: "executive-review-sim",
      notes: "Simulación — pendiente aprobación humana real",
    });
  }

  return entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function appendHistoryEntry(
  history: ImprovementHistoryEntry[],
  entry: Omit<ImprovementHistoryEntry, "id" | "timestamp">
): ImprovementHistoryEntry[] {
  return [
    ...history,
    {
      ...entry,
      id: `hist-${Date.now()}`,
      timestamp: NOW(),
    },
  ];
}
