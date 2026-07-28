import type { ForgePromptRecord } from "./types";

export function createPromptRecord(
  ventureId: string,
  workerId: string,
  templateId: string,
  prompt: string
): ForgePromptRecord {
  return {
    id: `prompt-${Date.now()}-${workerId}`,
    ventureId,
    workerId,
    templateId,
    prompt,
    timestamp: new Date().toISOString(),
  };
}
