/** Build Context — version history (Epic 6.0). */

import type { BuildContext, BuildContextHistoryEntry } from "./types";

const history = new Map<string, BuildContextHistoryEntry[]>();
const MAX_PER_VENTURE = 50;

function nextHistoryId(): string {
  return `bctx-hist-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function appendBuildContextHistory(
  context: BuildContext,
  action: BuildContextHistoryEntry["action"],
  summary: string,
  options?: { includeSnapshot?: boolean }
): BuildContextHistoryEntry {
  const ventureId = context.meta.ventureId;
  const entry: BuildContextHistoryEntry = {
    id: nextHistoryId(),
    ventureId,
    version: context.meta.version,
    action,
    summary,
    completenessScore: context.meta.completenessScore,
    createdAt: new Date().toISOString(),
    snapshot: options?.includeSnapshot ? structuredClone(context) : undefined,
  };

  const list = history.get(ventureId) ?? [];
  list.unshift(entry);
  if (list.length > MAX_PER_VENTURE) list.length = MAX_PER_VENTURE;
  history.set(ventureId, list);
  return entry;
}

export function getBuildContextHistory(ventureId: string): BuildContextHistoryEntry[] {
  return [...(history.get(ventureId) ?? [])];
}

export function clearBuildContextHistory(ventureId?: string): void {
  if (ventureId) history.delete(ventureId);
  else history.clear();
}
