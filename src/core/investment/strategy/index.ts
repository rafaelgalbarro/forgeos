/**
 * ForgeOS Investment OS — Strategy Engine
 *
 * Layering:
 * - domain: InvestmentStrategy contract, intents, metadata, helpers
 * - application: StrategyEngine, metadata registry, rule-based base
 * - infrastructure: concrete strategies + default engine factory
 *
 * Constraints: intents only (EntryIntent | ExitIntent | PositionIntent).
 * No order submission and no broker adapter coupling.
 */
export * from "./domain";
export * from "./application";
export * from "./infrastructure";
