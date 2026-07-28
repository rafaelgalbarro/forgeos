/** PROGRAM 6040 — Projection types (light read models) */

export interface MissionTimelineEntry {
  readonly eventId: string;
  readonly occurredAt: string;
  readonly actor: string;
  readonly action: string;
  readonly status?: string;
  readonly result?: string;
  readonly resourceLink?: string;
  readonly correlationId?: string;
  readonly missionId: string;
}

export interface MissionActivityEntry {
  readonly eventId: string;
  readonly occurredAt: string;
  readonly label: string;
  readonly department?: string;
  readonly missionId: string;
  readonly eventType: string;
}

export interface OutputStatusView {
  readonly outputId: string;
  readonly status: string;
  readonly updatedAt: string;
  readonly missionId?: string;
}

export interface BuildStatusView {
  readonly buildId: string;
  readonly status: string;
  readonly updatedAt: string;
  readonly missionId?: string;
}

export interface DeploymentHistoryEntry {
  readonly deploymentId: string;
  readonly status: string;
  readonly occurredAt: string;
  readonly action: string;
  readonly missionId?: string;
}

export interface AuditEntry {
  readonly eventId: string;
  readonly occurredAt: string;
  readonly actor: string;
  readonly action: string;
  readonly aggregateType: string;
  readonly aggregateId: string;
  readonly catalogKind: string;
  readonly correlationId: string;
}
