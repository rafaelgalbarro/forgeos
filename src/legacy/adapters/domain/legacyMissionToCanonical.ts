/**
 * Legacy → Canonical mission mapper (best-effort).
 * Maps to folder-based Mission entity (PROGRAM 6010).
 * Flat `mission.ts` remains the 6020 compat surface — do not import it here.
 */

import {
  Mission,
  type MissionIntention,
  type MissionPhase,
  type MissionProps,
  type MissionStatus,
} from "../../../core/domain/mission/entity";
import { asFounderId, asMissionId, asVentureId, asWorkspaceId } from "../../../core/domain/shared/ids";
import { CURRENT_SCHEMA_VERSION, type IsoTimestamp } from "../../../core/domain/shared/value-objects";
import { Metadata } from "../../../core/domain/shared/metadata";

export type LegacyMissionLike = {
  id: string;
  title: string;
  intention?: string | null;
  phase?: string;
  idea?: string;
  createdAt?: string;
  updatedAt?: string;
  projectId?: string;
};

export type LegacyMissionSessionLike = {
  missionId: string;
  workspaceId: string;
  ventureId?: string;
  founderId: string;
  status: string;
  currentStage?: string;
  intent?: { primary?: string; extractedIdea?: string; confidence?: number } | null;
  createdAt?: string;
  updatedAt?: string;
  state?: { sessionStatus?: string; phase?: string; blockedReason?: string };
};

export type LegacyMissionMappingGaps = {
  missingWorkspaceId: boolean;
  missingFounderId: boolean;
  statusApproximate: boolean;
  notes: string[];
};

const INTENTION_MAP: Record<string, MissionIntention> = {
  VENTURE: "VENTURE",
  WEBSITE: "WEBSITE",
  APPLICATION: "APPLICATION",
  MOBILE: "MOBILE",
  DISCOVERY: "DISCOVERY",
};

const STATUS_MAP: Record<string, MissionStatus> = {
  DRAFT: "DRAFT",
  UNDERSTANDING: "UNDERSTANDING",
  PLANNING: "PLANNING",
  BUILDING: "BUILDING",
  VALIDATING: "VALIDATING",
  READY_FOR_DEPLOY: "READY_FOR_DEPLOY",
  OPERATING: "OPERATING",
  EVOLVING: "EVOLVING",
  PAUSED: "PAUSED",
  BLOCKED: "BLOCKED",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  CANCELLED: "FAILED",
};

const PHASE_MAP: Record<string, MissionPhase> = {
  UNDERSTAND: "UNDERSTAND",
  PLAN: "PLAN",
  BUILD: "BUILD",
  VALIDATE: "VALIDATE",
  DEPLOY: "DEPLOY",
  OPERATE: "OPERATE",
  EVOLVE: "EVOLVE",
};

function asTs(value: string | undefined, fallback: string): IsoTimestamp {
  return (value && !Number.isNaN(Date.parse(value)) ? value : fallback) as IsoTimestamp;
}

export function legacyMissionToCanonical(
  legacy: LegacyMissionLike,
  context: { workspaceId: string; founderId: string; ventureId?: string }
): { mission: Mission; gaps: LegacyMissionMappingGaps } {
  const notes: string[] = [];
  const gaps: LegacyMissionMappingGaps = {
    missingWorkspaceId: !context.workspaceId,
    missingFounderId: !context.founderId,
    statusApproximate: true,
    notes,
  };

  notes.push("Legacy Mission lacks sessionStatus; defaulted to DRAFT");

  const intention = INTENTION_MAP[String(legacy.intention ?? "").toUpperCase()] ?? "UNSPECIFIED";
  if (!legacy.intention) notes.push("intention missing → UNSPECIFIED");

  const phase = PHASE_MAP[String(legacy.phase ?? "UNDERSTAND").toUpperCase()] ?? "UNDERSTAND";
  const now = new Date().toISOString();

  const props: MissionProps = {
    id: asMissionId(legacy.id),
    workspaceId: asWorkspaceId(context.workspaceId || "ws-unknown"),
    founderId: asFounderId(context.founderId || "founder-unknown"),
    ventureId: context.ventureId ? asVentureId(context.ventureId) : undefined,
    title: legacy.title || "Untitled mission",
    intention,
    status: "DRAFT",
    phase,
    ideaSummary: legacy.idea,
    createdAt: asTs(legacy.createdAt, now),
    updatedAt: asTs(legacy.updatedAt, now),
    metadata: Metadata({
      legacyProjectId: legacy.projectId ?? null,
      mappedFrom: "Mission",
    }),
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };

  if (gaps.missingWorkspaceId) notes.push("workspaceId supplied as ws-unknown");
  if (gaps.missingFounderId) notes.push("founderId supplied as founder-unknown");

  return { mission: Mission.rehydrate(props), gaps };
}

export function legacyMissionSessionToCanonical(session: LegacyMissionSessionLike): {
  mission: Mission;
  gaps: LegacyMissionMappingGaps;
} {
  const notes: string[] = [];
  const rawStatus = session.state?.sessionStatus ?? session.status;
  const status = STATUS_MAP[String(rawStatus).toUpperCase()] ?? "DRAFT";
  if (!STATUS_MAP[String(rawStatus).toUpperCase()]) {
    notes.push(`Unknown status ${rawStatus} → DRAFT`);
  }

  const intention =
    INTENTION_MAP[String(session.intent?.primary ?? "").toUpperCase()] ?? "UNSPECIFIED";
  const phase =
    PHASE_MAP[String(session.state?.phase ?? session.currentStage ?? "UNDERSTAND").toUpperCase()] ??
    "UNDERSTAND";
  const now = new Date().toISOString();

  const props: MissionProps = {
    id: asMissionId(session.missionId),
    workspaceId: asWorkspaceId(session.workspaceId),
    founderId: asFounderId(session.founderId),
    ventureId: session.ventureId ? asVentureId(session.ventureId) : undefined,
    title: session.intent?.extractedIdea?.slice(0, 80) || `Mission ${session.missionId}`,
    intention,
    status,
    phase,
    ideaSummary: session.intent?.extractedIdea,
    blockedReason: session.state?.blockedReason,
    createdAt: asTs(session.createdAt, now),
    updatedAt: asTs(session.updatedAt, now),
    metadata: Metadata({ mappedFrom: "MissionSession" }),
    schemaVersion: CURRENT_SCHEMA_VERSION,
  };

  return {
    mission: Mission.rehydrate(props),
    gaps: {
      missingWorkspaceId: false,
      missingFounderId: false,
      statusApproximate: notes.length > 0,
      notes,
    },
  };
}

export type LegacyMissionExport = {
  id: string;
  title: string;
  intention: string | null;
  phase: string;
  idea?: string;
  createdAt: string;
  updatedAt: string;
};

export function canonicalMissionToLegacy(mission: Mission): LegacyMissionExport {
  const s = mission.toSnapshot();
  return {
    id: s.id,
    title: s.title,
    intention: s.intention === "UNSPECIFIED" ? null : s.intention,
    phase: s.phase,
    idea: s.ideaSummary,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}
