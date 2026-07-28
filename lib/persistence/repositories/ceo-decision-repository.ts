/** CEO decisions & memory repository — Program 3000 Sprint 3. */

import type { CeoMemory, Decision } from "@/lib/intelligence-layer/types";
import type { PersistenceAdapter } from "../adapters/adapter-types";
import { PERSISTENCE_KEYS, type ICeoDecisionRepository } from "../types";

const EMPTY_CEO_MEMORY: CeoMemory = {
  briefings: [],
  recommendations: [],
  priorities: [],
  results: [],
  updatedAt: new Date().toISOString(),
};

export class CeoDecisionRepository implements ICeoDecisionRepository {
  constructor(private readonly adapter: PersistenceAdapter) {}

  async getAll(): Promise<Decision[]> {
    return this.adapter.read<Decision[]>(PERSISTENCE_KEYS.decisions, []);
  }

  async getByVenture(ventureId: string): Promise<Decision[]> {
    return (await this.getAll()).filter((d) => d.ventureId === ventureId);
  }

  async save(decision: Decision): Promise<Decision> {
    const all = await this.getAll();
    const i = all.findIndex((d) => d.id === decision.id);
    if (i >= 0) all[i] = decision;
    else all.push(decision);
    await this.adapter.write(PERSISTENCE_KEYS.decisions, all);
    return decision;
  }

  async getCeoMemory(): Promise<CeoMemory> {
    return this.adapter.read<CeoMemory>(
      PERSISTENCE_KEYS.ceoMemory,
      EMPTY_CEO_MEMORY
    );
  }

  async saveCeoMemory(memory: CeoMemory): Promise<CeoMemory> {
    const updated = { ...memory, updatedAt: new Date().toISOString() };
    await this.adapter.write(PERSISTENCE_KEYS.ceoMemory, updated);
    return updated;
  }
}
