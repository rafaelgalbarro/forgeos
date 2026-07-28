/** Workspace aggregate stub (Program 6010). Aligned with lib/workspace/types. */

import type { ActorId, WorkspaceId } from "./ids";
import type { DomainEvent } from "./events";

export type WorkspaceStatus = "active" | "archived";

export interface Workspace {
  id: WorkspaceId;
  name: string;
  slug: string;
  ownerId: ActorId;
  organizationId: string;
  ventureIds: string[];
  status: WorkspaceStatus;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceCreateInput {
  name: string;
  slug: string;
  ownerId: ActorId;
  organizationId?: string;
}

export function createWorkspaceAggregate(
  id: WorkspaceId,
  input: WorkspaceCreateInput,
  now: string,
): { workspace: Workspace; events: DomainEvent[] } {
  const workspace: Workspace = {
    id,
    name: input.name.trim(),
    slug: input.slug.trim().toLowerCase(),
    ownerId: input.ownerId,
    organizationId: input.organizationId ?? `org-${id}`,
    ventureIds: [],
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
  return {
    workspace,
    events: [
      {
        eventId: `evt-ws-${id}`,
        type: "WorkspaceCreated",
        occurredAt: now,
        aggregateId: id,
        aggregateType: "Workspace",
        workspaceId: id,
        payload: { name: workspace.name, slug: workspace.slug },
      },
    ],
  };
}
