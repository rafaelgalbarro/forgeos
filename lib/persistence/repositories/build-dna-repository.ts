/** Build DNA repository — Program 3000 Sprint 3. */

import type { BuildDna } from "@/lib/build-platform/build-dna/types";
import type { PersistenceAdapter } from "../adapters/adapter-types";
import { PERSISTENCE_KEYS, type IBuildDnaRepository } from "../types";
import { MapRepository } from "./base-repository";

export class BuildDnaRepository
  extends MapRepository<BuildDna>
  implements IBuildDnaRepository
{
  constructor(adapter: PersistenceAdapter) {
    super(adapter, PERSISTENCE_KEYS.buildDna);
  }

  async getByVenture(ventureId: string): Promise<BuildDna | null> {
    return (await this.get(ventureId)) ?? null;
  }

  async save(dna: BuildDna): Promise<BuildDna> {
    return this.set(dna.meta.ventureId, dna);
  }

  async delete(ventureId: string): Promise<boolean> {
    return super.delete(ventureId);
  }
}
