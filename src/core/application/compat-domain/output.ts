/** Output aggregate stub (Program 6010). Aligned with creation-output. */

import type { ActorId, MissionId, OutputId, WorkspaceId } from "./ids";
import type { DomainEvent } from "./events";

export type OutputStatus = "planned" | "generating" | "ready" | "change_requested" | "approved" | "rejected";

export interface Output {
  id: OutputId;
  workspaceId: WorkspaceId;
  missionId: MissionId;
  kind: string;
  title: string;
  summary?: string;
  status: OutputStatus;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export function planOutput(
  id: OutputId,
  input: { workspaceId: WorkspaceId; missionId: MissionId; kind: string; title: string },
  now: string,
): { output: Output; events: DomainEvent[] } {
  const output: Output = {
    id,
    workspaceId: input.workspaceId,
    missionId: input.missionId,
    kind: input.kind,
    title: input.title.trim(),
    status: "planned",
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
  return {
    output,
    events: [
      {
        eventId: `evt-out-${id}`,
        type: "OutputPlanned",
        occurredAt: now,
        aggregateId: id,
        aggregateType: "Output",
        workspaceId: input.workspaceId,
        payload: { kind: output.kind, title: output.title },
      },
    ],
  };
}

export function generateOutput(output: Output, summary: string, now: string): { output: Output; events: DomainEvent[] } {
  if (output.status !== "planned" && output.status !== "change_requested") {
    throw new Error(`Cannot generate output in status ${output.status}`);
  }
  const next: Output = { ...output, status: "ready", summary, updatedAt: now };
  return {
    output: next,
    events: [
      {
        eventId: `evt-out-gen-${output.id}-${now}`,
        type: "OutputGenerated",
        occurredAt: now,
        aggregateId: output.id,
        aggregateType: "Output",
        workspaceId: output.workspaceId,
        payload: { version: next.version },
      },
    ],
  };
}

export function requestOutputChange(output: Output, now: string): { output: Output; events: DomainEvent[] } {
  if (output.status !== "ready" && output.status !== "approved") {
    throw new Error(`Cannot request change in status ${output.status}`);
  }
  const next: Output = {
    ...output,
    status: "change_requested",
    version: output.version + 1,
    updatedAt: now,
  };
  return {
    output: next,
    events: [
      {
        eventId: `evt-out-chg-${output.id}-${now}`,
        type: "OutputChangeRequested",
        occurredAt: now,
        aggregateId: output.id,
        aggregateType: "Output",
        workspaceId: output.workspaceId,
        payload: { version: next.version },
      },
    ],
  };
}

export function approveOutput(
  output: Output,
  _actorId: ActorId,
  now: string,
): { output: Output; events: DomainEvent[] } {
  if (output.status !== "ready") {
    throw new Error(`Cannot approve output in status ${output.status}`);
  }
  const next: Output = { ...output, status: "approved", updatedAt: now };
  return {
    output: next,
    events: [
      {
        eventId: `evt-out-apr-${output.id}-${now}`,
        type: "OutputApproved",
        occurredAt: now,
        aggregateId: output.id,
        aggregateType: "Output",
        workspaceId: output.workspaceId,
        payload: {},
      },
    ],
  };
}
