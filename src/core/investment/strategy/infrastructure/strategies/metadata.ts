import type {
  StrategyCompatibleMarket,
  StrategyHistoricalPerformanceLevel,
  StrategyId,
  StrategyMetadata,
  StrategyRegime,
  StrategyTimeHorizonMeta,
} from "../../domain";

export function buildMetadata(input: {
  strategyId: StrategyId;
  name: string;
  version?: string;
  author?: string;
  date?: string;
  assumptions: readonly string[];
  limitations: readonly string[];
  compatibleRegimes: readonly StrategyRegime[];
  incompatibleRegimes: readonly StrategyRegime[];
  risks: readonly string[];
  evidences: readonly string[];
  compatibleMarkets?: readonly StrategyCompatibleMarket[];
  compatibleAssets?: readonly string[];
  timeHorizon?: StrategyTimeHorizonMeta;
  idealConditions?: readonly string[];
  unfavorableConditions?: readonly string[];
  historicalPerformanceLevel?: StrategyHistoricalPerformanceLevel;
  currentConfidence?: number;
}): StrategyMetadata {
  return {
    strategyId: input.strategyId,
    name: input.name,
    version: input.version ?? "1.0.0",
    author: input.author ?? "ForgeOS Investment OS",
    date: input.date ?? "2026-07-30",
    assumptions: input.assumptions,
    limitations: input.limitations,
    compatibleRegimes: input.compatibleRegimes,
    incompatibleRegimes: input.incompatibleRegimes,
    risks: input.risks,
    evidences: input.evidences,
    compatibleMarkets: input.compatibleMarkets,
    compatibleAssets: input.compatibleAssets,
    timeHorizon: input.timeHorizon,
    idealConditions: input.idealConditions,
    unfavorableConditions: input.unfavorableConditions,
    historicalPerformanceLevel: input.historicalPerformanceLevel ?? "unproven",
    currentConfidence: input.currentConfidence ?? 0.5,
  };
}
