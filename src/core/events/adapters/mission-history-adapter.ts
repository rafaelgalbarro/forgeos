/** PROGRAM 6040 — Mission history entries → canonical envelope */

import type { MissionHistoryEntry } from "@/lib/mission-control/types";
import type { DomainEventEnvelope } from "../envelope";
import { wrapLegacyEvent } from "./wrap-legacy";

export function adaptMissionHistoryEntry(
  entry: MissionHistoryEntry,
  opts: { missionId: string; workspaceId?: string }
): DomainEventEnvelope {
  return wrapLegacyEvent({
    integrationType: "MISSION_HISTORY_INGESTED",
    mappedDomainType: "MISSION_TIMELINE_APPENDED",
    catalogKind: "domain",
    source: "mission-history",
    sourceEventId: entry.id,
    occurredAt: entry.timestamp,
    workspaceId: opts.workspaceId,
    missionId: opts.missionId,
    aggregateType: "Mission",
    aggregateId: opts.missionId,
    actorKind: "system",
    actorId: "mission-history",
    payload: {
      label: entry.action,
      action: entry.action,
      phase: entry.phase,
      sessionStatus: entry.sessionStatus,
      detail: entry.detail ?? null,
      status: entry.sessionStatus,
      result: entry.detail ?? null,
    },
  });
}
