/** Department / organization snapshot repository — Program 3000 Sprint 3. */

import type { OrganizationSnapshot } from "@/lib/autonomous-organization/types";
import type { PersistenceAdapter } from "../adapters/adapter-types";
import { PERSISTENCE_KEYS, type IDepartmentRepository } from "../types";
import { MapRepository } from "./base-repository";

export class DepartmentRepository
  extends MapRepository<OrganizationSnapshot>
  implements IDepartmentRepository
{
  constructor(adapter: PersistenceAdapter) {
    super(adapter, PERSISTENCE_KEYS.departments);
  }

  async getByVenture(ventureId: string): Promise<OrganizationSnapshot | null> {
    return (await this.get(ventureId)) ?? null;
  }

  async save(
    ventureId: string,
    snapshot: OrganizationSnapshot
  ): Promise<OrganizationSnapshot> {
    return this.set(ventureId, snapshot);
  }

  async delete(ventureId: string): Promise<boolean> {
    return super.delete(ventureId);
  }
}
