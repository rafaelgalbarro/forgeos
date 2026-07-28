/** Organization repository — Program 3000 Sprint 3. */

import type { WorkspaceOrganization } from "@/lib/workspace/types";
import type { PersistenceAdapter } from "../adapters/adapter-types";
import { PERSISTENCE_KEYS, type IOrganizationRepository } from "../types";
import { ListRepository } from "./base-repository";

export class OrganizationRepository
  extends ListRepository<WorkspaceOrganization>
  implements IOrganizationRepository
{
  constructor(adapter: PersistenceAdapter) {
    super(adapter, PERSISTENCE_KEYS.organizations);
  }

  async findByOwner(ownerId: string): Promise<WorkspaceOrganization[]> {
    return (await this.findAll()).filter((o) => o.ownerId === ownerId);
  }

  async findBySlug(slug: string): Promise<WorkspaceOrganization | null> {
    return (await this.findAll()).find((o) => o.slug === slug) ?? null;
  }
}
