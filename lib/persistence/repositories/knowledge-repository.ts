/** Knowledge catalog repository — Program 3000 Sprint 3. */

import type { KnowledgeEntryBase } from "@/lib/knowledge/types";
import type { PersistenceAdapter } from "../adapters/adapter-types";
import { PERSISTENCE_KEYS, type IKnowledgeRepository } from "../types";
import { ListRepository } from "./base-repository";

export class KnowledgeRepository
  extends ListRepository<KnowledgeEntryBase>
  implements IKnowledgeRepository
{
  constructor(adapter: PersistenceAdapter) {
    super(adapter, PERSISTENCE_KEYS.knowledge);
  }

  async query(filter: {
    domain?: string;
    search?: string;
    limit?: number;
  }): Promise<KnowledgeEntryBase[]> {
    let results = await this.findAll();

    if (filter.domain) {
      results = results.filter((e) => e.domain === filter.domain);
    }

    if (filter.search) {
      const q = filter.search.toLowerCase();
      results = results.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.description.toLowerCase().includes(q) ||
          e.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (filter.limit && filter.limit > 0) {
      results = results.slice(0, filter.limit);
    }

    return results;
  }
}
