/** Venture repository — Program 3000 Sprint 3. */

import type { VentureProject } from "@/lib/domain/venture";
import type { PersistenceAdapter } from "../adapters/adapter-types";
import { PERSISTENCE_KEYS, type IVentureRepository } from "../types";
import { ListRepository } from "./base-repository";

export class VentureRepository
  extends ListRepository<VentureProject>
  implements IVentureRepository
{
  constructor(adapter: PersistenceAdapter) {
    super(adapter, PERSISTENCE_KEYS.ventures);
  }

  async save(venture: VentureProject): Promise<VentureProject> {
    const updated = {
      ...venture,
      updatedAt: new Date().toISOString(),
    };
    return super.save(updated);
  }

  async findByWorkspace(
    _workspaceId: string,
    ventureIds: string[]
  ): Promise<VentureProject[]> {
    const idSet = new Set(ventureIds);
    return (await this.findAll()).filter((v) => idSet.has(v.id));
  }
}
