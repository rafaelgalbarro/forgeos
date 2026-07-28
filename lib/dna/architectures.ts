import type { ForgeArchitectureRecord } from "./types";

export function createArchitectureRecord(
  ventureId: string,
  stack: string[],
  summary: string
): ForgeArchitectureRecord {
  return {
    id: `arch-${ventureId}`,
    ventureId,
    stack,
    summary,
    timestamp: new Date().toISOString(),
  };
}
