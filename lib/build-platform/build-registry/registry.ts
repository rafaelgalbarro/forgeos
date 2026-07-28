/** Build Registry — core in-memory engine (Epic 6.2). */

import type {
  BuildRegistry,
  RegistryEntry,
  RegistryEntryStatus,
  RegistryEntryType,
  RegistryQuery,
  RegistryStats,
} from "./types";

function matchesQuery(entry: RegistryEntry, query: RegistryQuery): boolean {
  if (query.type && entry.type !== query.type) return false;
  if (query.status && entry.status !== query.status) return false;
  if (query.category && entry.category !== query.category) return false;
  if (query.version && entry.version !== query.version) return false;
  if (query.tag && !entry.tags?.includes(query.tag)) return false;
  if (
    query.capability &&
    !entry.capabilities.some((c) => c.id === query.capability)
  ) {
    return false;
  }
  if (query.search) {
    const needle = query.search.toLowerCase();
    const haystack = [
      entry.id,
      entry.name,
      entry.description,
      entry.category ?? "",
      ...(entry.tags ?? []),
      ...entry.capabilities.map((c) => `${c.id} ${c.label}`),
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(needle)) return false;
  }
  return true;
}

export function createBuildRegistry(): BuildRegistry {
  const entries = new Map<string, RegistryEntry>();

  return {
    register(entry: RegistryEntry): RegistryEntry {
      if (entries.has(entry.id)) {
        throw new Error(`Registry entry already exists: ${entry.id}`);
      }
      const stored = { ...entry, updatedAt: entry.updatedAt || new Date().toISOString() };
      entries.set(entry.id, stored);
      return stored;
    },

    unregister(id: string): boolean {
      return entries.delete(id);
    },

    find(id: string): RegistryEntry | undefined {
      return entries.get(id);
    },

    list(): RegistryEntry[] {
      return [...entries.values()].sort((a, b) => a.name.localeCompare(b.name));
    },

    filter(query: RegistryQuery): RegistryEntry[] {
      return this.list().filter((e) => matchesQuery(e, query));
    },

    stats(): RegistryStats {
      const all = this.list();
      const byType = {} as Record<RegistryEntryType, number>;
      const byStatus = {} as Record<RegistryEntryStatus, number>;

      for (const entry of all) {
        byType[entry.type] = (byType[entry.type] ?? 0) + 1;
        byStatus[entry.status] = (byStatus[entry.status] ?? 0) + 1;
      }

      return { total: all.length, byType, byStatus };
    },

    clear(): void {
      entries.clear();
    },
  };
}

export function registerMany(
  registry: BuildRegistry,
  items: RegistryEntry[]
): RegistryEntry[] {
  return items.map((item) => registry.register(item));
}
