/** Build context repository — Program 3000 Sprint 3. */

import type { BuildContext } from "@/lib/build-platform/build-context/types";
import type { PersistenceAdapter } from "../adapters/adapter-types";
import { PERSISTENCE_KEYS, type IBuildContextRepository } from "../types";
import { MapRepository } from "./base-repository";

export class BuildContextRepository
  extends MapRepository<BuildContext>
  implements IBuildContextRepository
{
  constructor(adapter: PersistenceAdapter) {
    super(adapter, PERSISTENCE_KEYS.buildContext);
  }

  async getByVenture(ventureId: string): Promise<BuildContext | null> {
    return (await this.get(ventureId)) ?? null;
  }

  async save(context: BuildContext): Promise<BuildContext> {
    return this.set(context.meta.ventureId, context);
  }

  async delete(ventureId: string): Promise<boolean> {
    return super.delete(ventureId);
  }

  async listAll(): Promise<BuildContext[]> {
    return super.getAll();
  }
}
