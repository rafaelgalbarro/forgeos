/** Documents repository — Program 3000 Sprint 3. */

import type { PersistenceAdapter } from "../adapters/adapter-types";
import { PERSISTENCE_KEYS, type IDocumentRepository, type PersistedDocument } from "../types";
import { ListRepository } from "./base-repository";

export class DocumentRepository
  extends ListRepository<PersistedDocument>
  implements IDocumentRepository
{
  constructor(adapter: PersistenceAdapter) {
    super(adapter, PERSISTENCE_KEYS.documents);
  }

  async findByVenture(ventureId: string): Promise<PersistedDocument[]> {
    return (await this.findAll()).filter((d) => d.ventureId === ventureId);
  }
}
