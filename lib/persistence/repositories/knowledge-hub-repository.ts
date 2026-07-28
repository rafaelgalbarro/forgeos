/** Knowledge hub index repository — Program 3000 Sprint 3. */

import type { KnowledgeHubIndex } from "@/lib/knowledge-hub/types";
import type { PersistenceAdapter } from "../adapters/adapter-types";
import { PERSISTENCE_KEYS, type IKnowledgeHubRepository } from "../types";
import { MapRepository } from "./base-repository";

export class KnowledgeHubRepository
  extends MapRepository<KnowledgeHubIndex>
  implements IKnowledgeHubRepository
{
  constructor(adapter: PersistenceAdapter) {
    super(adapter, PERSISTENCE_KEYS.knowledgeHub);
  }

  async getByVenture(ventureId: string): Promise<KnowledgeHubIndex | null> {
    return (await this.get(ventureId)) ?? null;
  }

  async save(index: KnowledgeHubIndex): Promise<KnowledgeHubIndex> {
    return this.set(index.ventureId, index);
  }

  async delete(ventureId: string): Promise<boolean> {
    return super.delete(ventureId);
  }
}
