/**
 * PROGRAM 6040 — Mission Timeline from real events only.
 * Never invents activity. Correlation ID shown only in technical mode.
 */

import type { DomainEventEnvelope } from "../envelope";
import { projectMissionTimeline, type MissionTimelineEntry } from "../projections";

export interface TimelineViewOptions {
  readonly technicalMode?: boolean;
  readonly missionId?: string;
}

export interface TimelineRow {
  readonly date: string;
  readonly actor: string;
  readonly action: string;
  readonly status?: string;
  readonly result?: string;
  readonly resourceLink?: string;
  /** Present only when technicalMode=true */
  readonly correlationId?: string;
}

export function deriveMissionTimeline(
  events: readonly DomainEventEnvelope[],
  options: TimelineViewOptions = {}
): TimelineRow[] {
  const entries: MissionTimelineEntry[] = projectMissionTimeline(events, options.missionId);
  return entries.map((e) => ({
    date: e.occurredAt,
    actor: e.actor,
    action: e.action,
    status: e.status,
    result: e.result,
    resourceLink: e.resourceLink,
    correlationId: options.technicalMode ? e.correlationId : undefined,
  }));
}
