import type { DNAStore, ForgeProjectDNA } from "./types";

const STORAGE_KEY = "forgeos_dna";

class LocalDNAStore implements DNAStore {
  private read(): ForgeProjectDNA[] {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as ForgeProjectDNA[]) : [];
    } catch {
      return [];
    }
  }

  private write(records: ForgeProjectDNA[]): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }

  get(ventureId: string): ForgeProjectDNA | null {
    return this.read().find((r) => r.ventureId === ventureId) ?? null;
  }

  save(record: ForgeProjectDNA): void {
    const records = this.read().filter((r) => r.ventureId !== record.ventureId);
    records.unshift({ ...record, updatedAt: new Date().toISOString() });
    this.write(records);
  }

  list(): ForgeProjectDNA[] {
    return this.read();
  }
}

export const dnaStore: DNAStore = new LocalDNAStore();
