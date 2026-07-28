/** Venture aggregate stub (Program 6010). Aligned with lib/domain/venture. */

import type { ActorId, VentureId, WorkspaceId } from "./ids";
import type { DomainEvent } from "./events";

export type VentureStatus = "draft" | "active" | "paused" | "archived";

export interface Venture {
  id: VentureId;
  workspaceId: WorkspaceId;
  name: string;
  slug: string;
  idea?: string;
  ownerId: ActorId;
  status: VentureStatus;
  missionIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface VentureCreateInput {
  workspaceId: WorkspaceId;
  name: string;
  slug: string;
  ownerId: ActorId;
  idea?: string;
}

export function createVentureAggregate(
  id: VentureId,
  input: VentureCreateInput,
  now: string,
): { venture: Venture; events: DomainEvent[] } {
  const venture: Venture = {
    id,
    workspaceId: input.workspaceId,
    name: input.name.trim(),
    slug: input.slug.trim().toLowerCase(),
    idea: input.idea?.trim(),
    ownerId: input.ownerId,
    status: "draft",
    missionIds: [],
    createdAt: now,
    updatedAt: now,
  };
  return {
    venture,
    events: [
      {
        eventId: `evt-ven-${id}`,
        type: "VentureCreated",
        occurredAt: now,
        aggregateId: id,
        aggregateType: "Venture",
        workspaceId: input.workspaceId,
        payload: { name: venture.name, slug: venture.slug },
      },
    ],
  };
}
