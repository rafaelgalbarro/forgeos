/** Thin adapter — Founder Zero history as venture memory source. */

import type { VentureMemory } from "../types";

export async function syncFounderMemoryHint(missionId: string): Promise<{ synced: boolean; factCount: number }> {
  if (typeof window === "undefined") return { synced: false, factCount: 0 };
  try {
    const { readValidationHistory } = await import("@/lib/founder-zero");
    const history = readValidationHistory();
    const related = history.filter((h) => h.ventureName?.includes(missionId.slice(0, 8)));
    return { synced: related.length > 0, factCount: related.length };
  } catch {
    return { synced: false, factCount: 0 };
  }
}

export async function appendFounderHistoryFact(missionId: string, _fact: string): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const { appendValidationHistory } = await import("@/lib/founder-zero");
    appendValidationHistory({
      ventureId: missionId,
      ventureName: `MC:${missionId.slice(0, 12)}`,
      ranAt: new Date().toISOString(),
      overallScore: 0,
      completedStages: 0,
      totalStages: 8,
    });
  } catch {
    /* founder-zero unavailable — local memory only */
  }
}

export function mergeFounderHints(memory: VentureMemory, hints: string[]): VentureMemory {
  if (!hints.length) return memory;
  const keyFacts = [...new Set([...memory.keyFacts, ...hints])].slice(0, 20);
  return { ...memory, keyFacts, lastUpdated: new Date().toISOString() };
}
