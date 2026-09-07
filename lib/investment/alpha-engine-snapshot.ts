import "server-only";

import {
  buildAlphaEngineSnapshotAsync,
  recordAlphaEngineSnapshotToMemory,
  type AlphaEngineFilters,
  type AlphaEngineSnapshot,
} from "@/src/core/investment/alpha-engine/server";

export async function getAlphaEngineSnapshot(options?: {
  readonly filters?: AlphaEngineFilters;
  readonly openPositionSymbols?: readonly string[];
  readonly persistMemory?: boolean;
}): Promise<AlphaEngineSnapshot & { readonly memoryRecordId: string | null }> {
  const snapshot = await buildAlphaEngineSnapshotAsync({
    filters: options?.filters,
    openPositionSymbols: options?.openPositionSymbols,
  });

  let memoryRecordId: string | null = null;
  if (options?.persistMemory !== false) {
    const mem = await recordAlphaEngineSnapshotToMemory(snapshot);
    memoryRecordId = mem.recorded ? mem.id : null;
  }

  return { ...snapshot, memoryRecordId };
}
