import type { ForgeLesson } from "./types";

export function createLesson(
  ventureId: string,
  title: string,
  insight: string,
  source: ForgeLesson["source"] = "heuristic"
): ForgeLesson {
  return {
    id: `lesson-${Date.now()}`,
    ventureId,
    title,
    insight,
    source,
    timestamp: new Date().toISOString(),
  };
}
