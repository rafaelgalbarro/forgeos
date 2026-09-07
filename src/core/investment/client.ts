/**
 * Browser-safe investment entry.
 * Types, DTOs, and presentation helpers only — never filesystem / IBKR / orchestrators.
 */
export * from "./types";
export * from "./presentation/dto";
export * from "./presentation/memory-dto";
export * from "./presentation/portfolio-analytics-dashboard";
export * from "./portfolio-monitor/client";
export * from "./opportunity/client";
export * as StrategyLab from "./strategy-lab/client";
export * as AlphaEngine from "./alpha-engine/client";
