/**
 * Research engine contract — modular services under lib/investment/research.
 */

import type { MarketIntelligenceResult } from "@/src/core/investment/market-intelligence/domain/types";
import type {
  EngineRunResult,
  EngineWiringStatus,
  ResearchEngineId,
} from "../types";

export type ResearchEngineContext = {
  readonly symbol: string;
  readonly symbols: readonly string[];
  readonly mi: MarketIntelligenceResult | null;
  readonly newsProviders: readonly string[];
  readonly economicProviders: readonly string[];
  readonly sentimentProviders: readonly string[];
  readonly marketProviders: readonly string[];
  readonly providersConfigured: number;
  readonly generatedAt: string;
};

export type ResearchEngine = {
  readonly id: ResearchEngineId;
  readonly title: string;
  readonly description: string;
  /** Static wiring hint before run (CONFIG_REQUIRED when no providers). */
  resolveWiring(ctx: ResearchEngineContext): EngineWiringStatus;
  run(ctx: ResearchEngineContext): Promise<EngineRunResult> | EngineRunResult;
};

export function baseResult(
  engineId: ResearchEngineId,
  title: string,
  partial: Omit<EngineRunResult, "engineId" | "title" | "generatedAt"> & {
    generatedAt?: string;
  },
  generatedAt: string,
): EngineRunResult {
  return {
    engineId,
    title,
    generatedAt: partial.generatedAt ?? generatedAt,
    status: partial.status,
    summary: partial.summary,
    lines: partial.lines,
    itemCount: partial.itemCount,
    providers: partial.providers,
    evidence: partial.evidence,
    signal: partial.signal,
  };
}
