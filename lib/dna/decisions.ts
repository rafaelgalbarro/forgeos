import type { ForgeDecision } from "./types";

export function createDecision(
  ventureId: string,
  workerId: string,
  title: string,
  rationale: string
): ForgeDecision {
  return {
    id: `dec-${Date.now()}-${workerId}`,
    ventureId,
    workerId,
    title,
    rationale,
    timestamp: new Date().toISOString(),
  };
}
