/** Decision aggregate stub (Program 6010). */

import type { ActorId, DecisionId, MissionId, WorkspaceId } from "./ids";
import type { DomainEvent } from "./events";

export type DecisionStatus = "pending" | "resolved" | "cancelled";

export interface Decision {
  id: DecisionId;
  workspaceId: WorkspaceId;
  missionId: MissionId;
  title: string;
  description: string;
  options: string[];
  status: DecisionStatus;
  selectedOption?: string;
  requestedBy: ActorId;
  resolvedBy?: ActorId;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export function requestDecision(
  id: DecisionId,
  input: {
    workspaceId: WorkspaceId;
    missionId: MissionId;
    title: string;
    description: string;
    options: string[];
    requestedBy: ActorId;
  },
  now: string,
): { decision: Decision; events: DomainEvent[] } {
  if (input.options.length < 2) {
    throw new Error("Decision requires at least two options");
  }
  const decision: Decision = {
    id,
    workspaceId: input.workspaceId,
    missionId: input.missionId,
    title: input.title.trim(),
    description: input.description.trim(),
    options: input.options,
    status: "pending",
    requestedBy: input.requestedBy,
    createdAt: now,
    updatedAt: now,
  };
  return {
    decision,
    events: [
      {
        eventId: `evt-dec-${id}`,
        type: "DecisionRequested",
        occurredAt: now,
        aggregateId: id,
        aggregateType: "Decision",
        workspaceId: input.workspaceId,
        payload: { missionId: input.missionId, title: decision.title },
      },
    ],
  };
}

export function resolveDecision(
  decision: Decision,
  selectedOption: string,
  resolvedBy: ActorId,
  now: string,
): { decision: Decision; events: DomainEvent[] } {
  if (decision.status !== "pending") {
    throw new Error(`Cannot resolve decision in status ${decision.status}`);
  }
  if (!decision.options.includes(selectedOption)) {
    throw new Error(`Option not allowed: ${selectedOption}`);
  }
  const next: Decision = {
    ...decision,
    status: "resolved",
    selectedOption,
    resolvedBy,
    resolvedAt: now,
    updatedAt: now,
  };
  return {
    decision: next,
    events: [
      {
        eventId: `evt-dec-res-${decision.id}-${now}`,
        type: "DecisionResolved",
        occurredAt: now,
        aggregateId: decision.id,
        aggregateType: "Decision",
        workspaceId: decision.workspaceId,
        payload: { selectedOption, resolvedBy },
      },
    ],
  };
}
