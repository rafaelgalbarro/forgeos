import type { FosSnapshot } from "@/lib/fos";

export interface CeoMemoryState {
  lastBriefingAt: string | null;
  lastReviewAt: string | null;
  briefingCount: number;
  lastFosSnapshot: FosSnapshot | null;
}

const memory: CeoMemoryState = {
  lastBriefingAt: null,
  lastReviewAt: null,
  briefingCount: 0,
  lastFosSnapshot: null,
};

export function readCeoMemory(): Readonly<CeoMemoryState> {
  return { ...memory, lastFosSnapshot: memory.lastFosSnapshot };
}

export function recordBriefing(fos: FosSnapshot): void {
  memory.lastBriefingAt = new Date().toISOString();
  memory.briefingCount += 1;
  memory.lastFosSnapshot = fos;
}

export function recordReview(): void {
  memory.lastReviewAt = new Date().toISOString();
}
