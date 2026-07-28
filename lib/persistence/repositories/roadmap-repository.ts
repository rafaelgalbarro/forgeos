/** Roadmap items repository — Program 3000 Sprint 3. */

import type { PersistenceAdapter } from "../adapters/adapter-types";
import { PERSISTENCE_KEYS, type IRoadmapRepository, type PersistedRoadmap } from "../types";
import { ListRepository } from "./base-repository";

export class RoadmapRepository
  extends ListRepository<PersistedRoadmap>
  implements IRoadmapRepository
{
  constructor(adapter: PersistenceAdapter) {
    super(adapter, PERSISTENCE_KEYS.roadmaps);
  }

  async findByVenture(ventureId: string): Promise<PersistedRoadmap[]> {
    return (await this.findAll()).filter((r) => r.ventureId === ventureId);
  }
}
