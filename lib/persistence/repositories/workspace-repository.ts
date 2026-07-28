/** Workspace repository — Program 3000 Sprint 3. */

import type { Workspace } from "@/lib/workspace/types";
import type { PersistenceAdapter } from "../adapters/adapter-types";
import { PERSISTENCE_KEYS, type IWorkspaceRepository } from "../types";
import { ListRepository } from "./base-repository";

export class WorkspaceRepository
  extends ListRepository<Workspace>
  implements IWorkspaceRepository
{
  constructor(adapter: PersistenceAdapter) {
    super(adapter, PERSISTENCE_KEYS.workspaces);
  }

  async findByOwner(ownerId: string): Promise<Workspace[]> {
    return (await this.findAll()).filter((w) => w.ownerId === ownerId);
  }

  async findByOrganization(organizationId: string): Promise<Workspace[]> {
    return (await this.findAll()).filter(
      (w) => w.organizationId === organizationId
    );
  }
}
