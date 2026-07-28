/**
 * Thin V2 query adapters — invoke Queries only.
 */

"use server";

import type {
  CompanyOverviewView,
  MissionOverviewView,
  MissionTimelineView,
} from "@/src/core/application";
import { getPresentationApplicationLayer } from "../application-cache";

export async function getMissionOverview(input: {
  actorId: string;
  missionId: string;
  correlationId?: string;
}): Promise<{ ok: true; data: MissionOverviewView } | { ok: false; error: unknown }> {
  const app = getPresentationApplicationLayer();
  return app.queryBus.execute({
    type: "GetMissionOverview",
    payload: { missionId: input.missionId },
    meta: {
      actorId: input.actorId,
      correlationId: input.correlationId,
    },
  });
}

export async function getMissionTimeline(input: {
  actorId: string;
  missionId: string;
}): Promise<{ ok: true; data: MissionTimelineView } | { ok: false; error: unknown }> {
  const app = getPresentationApplicationLayer();
  return app.queryBus.execute({
    type: "GetMissionTimeline",
    payload: { missionId: input.missionId },
    meta: { actorId: input.actorId },
  });
}

export async function getCompanyOperatingOverview(input: {
  actorId: string;
  workspaceId: string;
}): Promise<{ ok: true; data: CompanyOverviewView } | { ok: false; error: unknown }> {
  const app = getPresentationApplicationLayer();
  return app.queryBus.execute({
    type: "GetCompanyOperatingOverview",
    payload: { workspaceId: input.workspaceId },
    meta: { actorId: input.actorId, workspaceId: input.workspaceId },
  });
}
