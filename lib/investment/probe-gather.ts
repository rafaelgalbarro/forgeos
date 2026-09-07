import "server-only";

import { gatherScreener } from "@/lib/investment/screener-gather";

export type ProbeGatherSnapshot = {
  readonly generatedAt: string;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly liveTradingEnabled: false;
  readonly ibkrReadOnly: true;
  readonly autonomousLive: "LOCKED";
  readonly symbols: readonly string[];
  readonly providersConfigured: number;
  readonly providersUsed: readonly string[];
  readonly counts: {
    readonly marketSnapshots: number;
    readonly news: number;
    readonly economic: number;
    readonly sentiment: number;
  };
  readonly empty: boolean;
  readonly note: string;
};

/**
 * ANALYSIS_ONLY MI gather probe for Settings — counts only, never secrets or raw payloads.
 */
export async function probeGather(
  symbolsInput?: readonly string[],
  env: NodeJS.ProcessEnv = process.env,
): Promise<ProbeGatherSnapshot> {
  const gather = await gatherScreener(symbolsInput, env);
  const result = gather.result;
  return {
    generatedAt: gather.generatedAt,
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    liveTradingEnabled: false,
    ibkrReadOnly: true,
    autonomousLive: "LOCKED",
    symbols: gather.symbols,
    providersConfigured: gather.providersConfigured,
    providersUsed: result?.providersUsed ?? [],
    counts: {
      marketSnapshots: result?.marketSnapshots.length ?? 0,
      news: result?.news.length ?? 0,
      economic: result?.economicIndicators.length ?? 0,
      sentiment: result?.sentiment.length ?? 0,
    },
    empty: gather.empty,
    note: gather.empty
      ? gather.note
      : `${gather.note} Probe returns counts only — secret values never included.`,
  };
}
