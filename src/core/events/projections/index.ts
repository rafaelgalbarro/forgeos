/**
 * PROGRAM 6040 — Projections rebuildable from event log (dry-run safe).
 * Pages should read these light projections — never invent activity.
 */

import type { DomainEventEnvelope } from "../envelope";
import type { EventLogRepository } from "../store";
import type {
  AuditEntry,
  BuildStatusView,
  DeploymentHistoryEntry,
  MissionActivityEntry,
  MissionTimelineEntry,
  OutputStatusView,
} from "./types";

function actorLabel(event: DomainEventEnvelope): string {
  return event.actor.label ?? `${event.actor.kind}:${event.actor.id}`;
}

function payloadString(event: DomainEventEnvelope, key: string): string | undefined {
  if (!event.payload || typeof event.payload !== "object" || Array.isArray(event.payload)) {
    return undefined;
  }
  const v = (event.payload as Record<string, unknown>)[key];
  return v === undefined || v === null ? undefined : String(v);
}

export function projectMissionTimeline(
  events: readonly DomainEventEnvelope[],
  missionId?: string
): MissionTimelineEntry[] {
  return events
    .filter((e) => e.catalogKind !== "telemetry")
    .filter((e) => (missionId ? String(e.missionId ?? "") === missionId : true))
    .slice()
    .sort((a, b) => String(a.occurredAt).localeCompare(String(b.occurredAt)))
    .map((e) => ({
      eventId: String(e.eventId),
      occurredAt: String(e.occurredAt),
      actor: actorLabel(e),
      action: e.eventType,
      status: payloadString(e, "to") ?? payloadString(e, "status"),
      result: payloadString(e, "result"),
      resourceLink: payloadString(e, "resourceLink"),
      correlationId: e.correlationId,
      missionId: String(e.missionId ?? e.aggregateId),
    }));
}

export function projectMissionActivity(
  events: readonly DomainEventEnvelope[],
  missionId?: string
): MissionActivityEntry[] {
  return events
    .filter((e) => e.catalogKind === "domain" || e.catalogKind === "integration" || e.catalogKind === "ui_notification")
    .filter((e) => (missionId ? String(e.missionId ?? "") === missionId : true))
    .slice()
    .sort((a, b) => String(b.occurredAt).localeCompare(String(a.occurredAt)))
    .map((e) => ({
      eventId: String(e.eventId),
      occurredAt: String(e.occurredAt),
      label: payloadString(e, "label") ?? e.eventType,
      department: payloadString(e, "department"),
      missionId: String(e.missionId ?? e.aggregateId),
      eventType: e.eventType,
    }));
}

export function projectOutputStatus(events: readonly DomainEventEnvelope[]): OutputStatusView[] {
  const map = new Map<string, OutputStatusView>();
  const ordered = events
    .filter((e) => e.aggregateType === "Output" || e.eventType.includes("OUTPUT"))
    .slice()
    .sort((a, b) => String(a.occurredAt).localeCompare(String(b.occurredAt)));
  for (const e of ordered) {
    const outputId = e.aggregateType === "Output" ? e.aggregateId : payloadString(e, "outputId") ?? e.aggregateId;
    map.set(outputId, {
      outputId,
      status: payloadString(e, "to") ?? payloadString(e, "status") ?? "UNKNOWN",
      updatedAt: String(e.occurredAt),
      missionId: e.missionId ? String(e.missionId) : undefined,
    });
  }
  return [...map.values()];
}

export function projectBuildStatus(events: readonly DomainEventEnvelope[]): BuildStatusView[] {
  const map = new Map<string, BuildStatusView>();
  const ordered = events
    .filter((e) => e.aggregateType === "Build" || e.eventType.includes("BUILD"))
    .slice()
    .sort((a, b) => String(a.occurredAt).localeCompare(String(b.occurredAt)));
  for (const e of ordered) {
    const buildId = e.aggregateType === "Build" ? e.aggregateId : payloadString(e, "buildId") ?? e.aggregateId;
    map.set(buildId, {
      buildId,
      status: payloadString(e, "to") ?? payloadString(e, "status") ?? "UNKNOWN",
      updatedAt: String(e.occurredAt),
      missionId: e.missionId ? String(e.missionId) : undefined,
    });
  }
  return [...map.values()];
}

export function projectDeploymentHistory(
  events: readonly DomainEventEnvelope[]
): DeploymentHistoryEntry[] {
  return events
    .filter((e) => e.aggregateType === "Deployment" || e.eventType.includes("DEPLOYMENT"))
    .slice()
    .sort((a, b) => String(a.occurredAt).localeCompare(String(b.occurredAt)))
    .map((e) => ({
      deploymentId: e.aggregateType === "Deployment" ? e.aggregateId : payloadString(e, "deploymentId") ?? e.aggregateId,
      status: payloadString(e, "to") ?? payloadString(e, "status") ?? "UNKNOWN",
      occurredAt: String(e.occurredAt),
      action: e.eventType,
      missionId: e.missionId ? String(e.missionId) : undefined,
    }));
}

export function projectAudit(events: readonly DomainEventEnvelope[]): AuditEntry[] {
  return events
    .filter((e) => e.catalogKind !== "telemetry")
    .slice()
    .sort((a, b) => String(a.occurredAt).localeCompare(String(b.occurredAt)))
    .map((e) => ({
      eventId: String(e.eventId),
      occurredAt: String(e.occurredAt),
      actor: actorLabel(e),
      action: e.eventType,
      aggregateType: e.aggregateType,
      aggregateId: e.aggregateId,
      catalogKind: e.catalogKind,
      correlationId: e.correlationId,
    }));
}

export interface ProjectionBundle {
  readonly missionTimeline: MissionTimelineEntry[];
  readonly missionActivity: MissionActivityEntry[];
  readonly outputStatus: OutputStatusView[];
  readonly buildStatus: BuildStatusView[];
  readonly deploymentHistory: DeploymentHistoryEntry[];
  readonly audit: AuditEntry[];
  readonly eventCount: number;
}

/** Rebuild all light projections from the event log (dry-run / debugging). */
export async function rebuildProjectionsFromLog(
  log: EventLogRepository,
  query?: { missionId?: string; workspaceId?: string }
): Promise<ProjectionBundle> {
  const events = await log.query({
    missionId: query?.missionId,
    workspaceId: query?.workspaceId,
  });
  const ordered = events
    .slice()
    .sort((a, b) => String(a.occurredAt).localeCompare(String(b.occurredAt)));
  return {
    missionTimeline: projectMissionTimeline(ordered, query?.missionId),
    missionActivity: projectMissionActivity(ordered, query?.missionId),
    outputStatus: projectOutputStatus(ordered),
    buildStatus: projectBuildStatus(ordered),
    deploymentHistory: projectDeploymentHistory(ordered),
    audit: projectAudit(ordered),
    eventCount: ordered.length,
  };
}

export {
  type MissionTimelineEntry,
  type MissionActivityEntry,
  type OutputStatusView,
  type BuildStatusView,
  type DeploymentHistoryEntry,
  type AuditEntry,
};
