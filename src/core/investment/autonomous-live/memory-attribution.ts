/**
 * Memory & performance attribution — learning dataset export.
 * Does NOT auto-modify production strategies.
 */

import type { TradeAttributionRecord } from "./domain";

export interface LearningDatasetExport {
  readonly exportedAt: string;
  readonly schemaVersion: "1.0.0";
  readonly records: readonly TradeAttributionRecord[];
  readonly autoStrategyMutationForbidden: true;
  readonly deployPath: "train-off-prod → backtest → walk-forward → paper → shadow → approval";
  readonly note: string;
}

export interface AttributionStore {
  append(record: TradeAttributionRecord): Promise<void>;
  list(): Promise<readonly TradeAttributionRecord[]>;
}

export class InMemoryAttributionStore implements AttributionStore {
  private readonly rows: TradeAttributionRecord[] = [];

  async append(record: TradeAttributionRecord): Promise<void> {
    if (!record.autoStrategyMutationForbidden) {
      throw new Error("Attribution must forbid auto strategy mutation");
    }
    this.rows.push(record);
  }

  async list(): Promise<readonly TradeAttributionRecord[]> {
    return [...this.rows];
  }
}

export async function exportLearningDataset(
  store: AttributionStore,
  nowIso = new Date().toISOString(),
): Promise<LearningDatasetExport> {
  const records = await store.list();
  return {
    exportedAt: nowIso,
    schemaVersion: "1.0.0",
    records,
    autoStrategyMutationForbidden: true,
    deployPath: "train-off-prod → backtest → walk-forward → paper → shadow → approval",
    note: "Offline learning only. New strategy versions require explicit approval before deploy. Production strategies are never auto-mutated.",
  };
}

export function summarizeAttribution(records: readonly TradeAttributionRecord[]): {
  readonly trades: number;
  readonly withExit: number;
  readonly avgConsensus: number;
  readonly realizedPnlSum: number | null;
} {
  if (records.length === 0) {
    return { trades: 0, withExit: 0, avgConsensus: 0, realizedPnlSum: null };
  }
  const withExit = records.filter((r) => r.exitReason != null).length;
  const avgConsensus = records.reduce((s, r) => s + r.consensusRatio, 0) / records.length;
  const pnls = records.map((r) => r.realizedPnl).filter((p): p is number => p != null);
  return {
    trades: records.length,
    withExit,
    avgConsensus: Number(avgConsensus.toFixed(4)),
    realizedPnlSum: pnls.length ? Number(pnls.reduce((a, b) => a + b, 0).toFixed(4)) : null,
  };
}
