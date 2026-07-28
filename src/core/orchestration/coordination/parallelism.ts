/** PROGRAM 6030 — Parallelism coordination via ports. */

import type { ConcurrencyLimits } from "../types";
import type { ParallelismPort } from "../ports/types";

export function createParallelismController(limits: ConcurrencyLimits): ParallelismPort {
  const active = new Set<string>();
  let cancelled = false;
  let providerCalls = 0;

  return {
    canRunParallel(nodeIds, nextLimits) {
      if (cancelled) return false;
      if (active.size + nodeIds.length > nextLimits.maxConcurrency) return false;
      if (providerCalls >= nextLimits.maxProviderCalls) return false;
      return true;
    },
    reserve(nodeId) {
      if (cancelled) throw new Error("Parallelism cancelled");
      if (active.size >= limits.maxConcurrency) {
        throw new Error("Concurrency limit reached");
      }
      active.add(nodeId);
      providerCalls += 1;
    },
    release(nodeId) {
      active.delete(nodeId);
    },
    activeCount() {
      return active.size;
    },
    cancelAll() {
      cancelled = true;
      active.clear();
    },
  };
}

/** Only nodes with satisfied dependencies may run together. */
export function selectParallelBatch(
  readyNodeIds: string[],
  limits: ConcurrencyLimits,
  parallelism: ParallelismPort,
): string[] {
  const batch: string[] = [];
  for (const id of readyNodeIds) {
    if (!parallelism.canRunParallel([...batch, id], limits)) break;
    batch.push(id);
  }
  return batch;
}
