/** Codebase aggregate stub (Program 6010). */

import type { ActorId, CodebaseId, MissionId, WorkspaceId } from "./ids";
import type { DomainEvent } from "./events";

export type CodebaseStatus = "empty" | "generating" | "ready" | "change_requested" | "approved";

export interface CodebaseNode {
  path: string;
  kind: "file" | "dir";
  children?: CodebaseNode[];
}

export interface Codebase {
  id: CodebaseId;
  workspaceId: WorkspaceId;
  missionId: MissionId;
  status: CodebaseStatus;
  root: CodebaseNode;
  summary?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export function generateCodebase(
  id: CodebaseId,
  input: { workspaceId: WorkspaceId; missionId: MissionId; summary?: string },
  now: string,
): { codebase: Codebase; events: DomainEvent[] } {
  const codebase: Codebase = {
    id,
    workspaceId: input.workspaceId,
    missionId: input.missionId,
    status: "ready",
    root: {
      path: "/",
      kind: "dir",
      children: [
        { path: "/src", kind: "dir", children: [{ path: "/src/index.ts", kind: "file" }] },
        { path: "/package.json", kind: "file" },
      ],
    },
    summary: input.summary ?? "Generated codebase scaffold",
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
  return {
    codebase,
    events: [
      {
        eventId: `evt-cb-${id}`,
        type: "CodebaseGenerated",
        occurredAt: now,
        aggregateId: id,
        aggregateType: "Codebase",
        workspaceId: input.workspaceId,
        payload: { missionId: input.missionId },
      },
    ],
  };
}

export function requestCodeChange(codebase: Codebase, now: string): { codebase: Codebase; events: DomainEvent[] } {
  if (codebase.status !== "ready" && codebase.status !== "approved") {
    throw new Error(`Cannot request code change in status ${codebase.status}`);
  }
  const next: Codebase = {
    ...codebase,
    status: "change_requested",
    version: codebase.version + 1,
    updatedAt: now,
  };
  return {
    codebase: next,
    events: [
      {
        eventId: `evt-cb-chg-${codebase.id}-${now}`,
        type: "CodeChangeRequested",
        occurredAt: now,
        aggregateId: codebase.id,
        aggregateType: "Codebase",
        workspaceId: codebase.workspaceId,
        payload: { version: next.version },
      },
    ],
  };
}

export function approveCodebase(
  codebase: Codebase,
  _actorId: ActorId,
  now: string,
): { codebase: Codebase; events: DomainEvent[] } {
  if (codebase.status !== "ready" && codebase.status !== "change_requested") {
    throw new Error(`Cannot approve codebase in status ${codebase.status}`);
  }
  const next: Codebase = { ...codebase, status: "approved", updatedAt: now };
  return {
    codebase: next,
    events: [
      {
        eventId: `evt-cb-apr-${codebase.id}-${now}`,
        type: "CodebaseApproved",
        occurredAt: now,
        aggregateId: codebase.id,
        aggregateType: "Codebase",
        workspaceId: codebase.workspaceId,
        payload: {},
      },
    ],
  };
}
