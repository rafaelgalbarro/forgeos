/**
 * Thin V2 server-action adapters — invoke Commands only.
 * Do not import React components. Legacy app/actions/* remain intact.
 */

"use server";

import type { MissionOverviewView, WorkspaceOverviewView } from "@/src/core/application";
import { getPresentationApplicationLayer } from "../application-cache";

export async function createWorkspaceAction(input: {
  actorId: string;
  name: string;
  slug: string;
  correlationId?: string;
}): Promise<{ ok: true; data: WorkspaceOverviewView } | { ok: false; error: unknown }> {
  const app = getPresentationApplicationLayer();
  return app.commandBus.execute({
    type: "CreateWorkspace",
    payload: { name: input.name, slug: input.slug },
    meta: {
      actorId: input.actorId,
      commandId: `cmd-ws-${input.slug}`,
      correlationId: input.correlationId,
    },
  });
}

export async function createMissionAction(input: {
  actorId: string;
  workspaceId: string;
  ventureId?: string;
  idea?: string;
  commandId?: string;
  idempotencyKey?: string;
  correlationId?: string;
}): Promise<{ ok: true; data: MissionOverviewView } | { ok: false; error: unknown }> {
  const app = getPresentationApplicationLayer();
  return app.commandBus.execute({
    type: "CreateMission",
    payload: {
      workspaceId: input.workspaceId,
      ventureId: input.ventureId,
      idea: input.idea,
    },
    meta: {
      actorId: input.actorId,
      workspaceId: input.workspaceId,
      commandId: input.commandId ?? `cmd-mis-${Date.now()}`,
      idempotencyKey: input.idempotencyKey,
      correlationId: input.correlationId,
    },
  });
}

export async function startBuildAction(input: {
  actorId: string;
  workspaceId: string;
  missionId: string;
  commandId?: string;
  idempotencyKey?: string;
}): Promise<{ ok: true; data: unknown } | { ok: false; error: unknown }> {
  const app = getPresentationApplicationLayer();
  return app.commandBus.execute({
    type: "StartBuild",
    payload: { workspaceId: input.workspaceId, missionId: input.missionId },
    meta: {
      actorId: input.actorId,
      workspaceId: input.workspaceId,
      commandId: input.commandId,
      idempotencyKey: input.idempotencyKey,
    },
  });
}
