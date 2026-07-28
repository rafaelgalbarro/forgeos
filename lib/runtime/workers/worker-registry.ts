/** ForgeOS Worker Runtime — in-memory registry (Epic 4.3). */

import { createWorkerInstance } from "./worker";
import type {
  WorkerDefinition,
  WorkerInstance,
  WorkerRegistry,
  WorkerRegistryQuery,
} from "./types";

export function createWorkerRegistry(): WorkerRegistry & {
  update(workerId: string, patch: Partial<WorkerInstance>): WorkerInstance | undefined;
} {
  const workers = new Map<string, WorkerInstance>();

  function matchesQuery(worker: WorkerInstance, query: WorkerRegistryQuery): boolean {
    if (query.department && worker.department !== query.department) return false;
    if (query.status && worker.status !== query.status) return false;
    if (query.version && worker.version !== query.version) return false;
    if (query.healthLevel && worker.health.level !== query.healthLevel) return false;
    if (query.capability && !worker.capabilities.some((c) => c.id === query.capability)) return false;
    if (query.taskType && !worker.supportedTasks.includes(query.taskType)) return false;
    if (query.ventureState && !worker.allowedStates.includes(query.ventureState)) return false;
    return true;
  }

  return {
    register(definition: WorkerDefinition): WorkerInstance {
      if (workers.has(definition.id)) {
        throw new Error(`Worker already registered: ${definition.id}`);
      }
      const instance = createWorkerInstance(definition);
      workers.set(definition.id, instance);
      return instance;
    },

    unregister(workerId: string): boolean {
      return workers.delete(workerId);
    },

    find(workerId: string): WorkerInstance | undefined {
      return workers.get(workerId);
    },

    list(): WorkerInstance[] {
      return [...workers.values()];
    },

    filter(query: WorkerRegistryQuery): WorkerInstance[] {
      return this.list().filter((w) => matchesQuery(w, query));
    },

    queryByCapability(capabilityId: string): WorkerInstance[] {
      return this.filter({ capability: capabilityId });
    },

    queryByStatus(status: WorkerInstance["status"]): WorkerInstance[] {
      return this.filter({ status });
    },

    queryByVersion(version: string): WorkerInstance[] {
      return this.filter({ version });
    },

    queryByHealth(level: WorkerInstance["health"]["level"]): WorkerInstance[] {
      return this.filter({ healthLevel: level });
    },

    clear(): void {
      workers.clear();
    },

    update(workerId: string, patch: Partial<WorkerInstance>): WorkerInstance | undefined {
      const existing = workers.get(workerId);
      if (!existing) return undefined;
      const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
      workers.set(workerId, updated);
      return updated;
    },
  };
}
