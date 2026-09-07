import "server-only";

/**
 * Node-only investment entry: repos, persistence, orchestrators, filesystem adapters.
 * Client Components must not import this module.
 */
export {
  createInMemoryInvestmentMemoryRepository,
  type InvestmentMemoryFsApi,
  type InvestmentMemoryQuery,
  type InvestmentMemoryRepository,
} from "./infrastructure/investment-memory-repository";
export {
  createDefaultInvestmentMemoryRepository,
  createFileInvestmentMemoryRepository,
  defaultInvestmentMemoryPath,
} from "./infrastructure/investment-memory-filesystem";
export * from "./infrastructure/ports";
export * from "./infrastructure/static-data-source";
export * from "./domain";
export * from "./application";
export * from "./presentation";
export * from "./live-runtime";
export * from "./shadow";
export * as PaperTrading from "./paper-trading";
export * as LiveMarketRuntime from "./runtime";
export * as RuntimeOs from "./runtime-os";
export * as MarketIntelligence from "./market-intelligence";
export * as ExecutionPipeline from "./execution-pipeline";
export * as DecisionPipeline from "./pipeline";
export * as LiveExecution from "./live-execution";
export * as PositionManager from "./position-manager";
export * as OpportunityScanner from "./opportunity-scanner";
export * as Opportunity from "./opportunity/server";
export * as PortfolioMonitor from "./portfolio-monitor/server";
export * as LiveRiskEngine from "./risk/live-risk-engine";
export * as StrategyEngine from "./strategy";
export * as AgentEcosystem from "./agent-ecosystem";
export * as ContinuousAnalysis from "./continuous-analysis";
export * as StrategyLab from "./strategy-lab/server";
export * as AlphaEngine from "./alpha-engine/server";
