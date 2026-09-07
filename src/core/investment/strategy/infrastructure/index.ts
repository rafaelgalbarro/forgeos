import { StrategyEngine, StrategyMetadataRegistry } from "../application";
import { createAllStrategies } from "./strategies";

export * from "./strategies";

/** Build a StrategyEngine preloaded with the initial strategy set. */
export function createDefaultStrategyEngine(): StrategyEngine {
  const engine = new StrategyEngine(new StrategyMetadataRegistry());
  for (const strategy of createAllStrategies()) {
    engine.register(strategy);
  }
  return engine;
}
