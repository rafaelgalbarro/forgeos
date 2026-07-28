/** Venture memory repository — Program 3000 Sprint 3. */

import type { VentureMemoryRecord } from "@/lib/intelligence-layer/types";
import type { PersistenceAdapter } from "../adapters/adapter-types";
import { PERSISTENCE_KEYS, type IMemoryRepository } from "../types";
import { MapRepository } from "./base-repository";

export class MemoryRepository
  extends MapRepository<VentureMemoryRecord>
  implements IMemoryRepository
{
  constructor(adapter: PersistenceAdapter) {
    super(adapter, PERSISTENCE_KEYS.ventureMemory);
  }

  async getByVenture(ventureId: string): Promise<VentureMemoryRecord | null> {
    return (await this.get(ventureId)) ?? null;
  }

  async save(record: VentureMemoryRecord): Promise<VentureMemoryRecord> {
    const saved = await this.set(record.ventureId, {
      ...record,
      syncedAt: new Date().toISOString(),
    });
    return saved;
  }

  async getAll(): Promise<VentureMemoryRecord[]> {
    return super.getAll();
  }

  async delete(ventureId: string): Promise<boolean> {
    return super.delete(ventureId);
  }
}
