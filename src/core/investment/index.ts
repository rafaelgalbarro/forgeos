/**
 * Canonical investment public surface (shared / analysis domain).
 * Filesystem repos and Node adapters: `@/src/core/investment/server`.
 * Browser UI: `@/src/core/investment/client`.
 * Broker-coupled providers stay out of the root barrel so unit tests do not load IBKR.
 */
export * from "./domain";
export * from "./application";
export * from "./presentation";
export {
  createInMemoryInvestmentMemoryRepository,
  type InvestmentMemoryQuery,
  type InvestmentMemoryRepository,
} from "./infrastructure/investment-memory-repository";
export * from "./infrastructure/ports";
export * from "./infrastructure/static-data-source";
export * from "./live-runtime";
export * from "./shadow";
/** Institutional paper trading — BrokerEngine paper path + pipeline/risk orchestration. Never activates live. */
export * as PaperTrading from "./paper-trading";
/** Live Market Runtime — namespaced to avoid collisions with live-runtime / runtime-os. */
export * as LiveMarketRuntime from "./runtime";
export * as RuntimeOs from "./runtime-os";
export * as MarketIntelligence from "./market-intelligence";
export * as ExecutionPipeline from "./execution-pipeline";
export * as DecisionPipeline from "./pipeline";
export * as LiveExecution from "./live-execution";
export * as AutonomousLive from "./autonomous-live";
export * as PositionManager from "./position-manager";
export * as OpportunityScanner from "./opportunity-scanner";
export * as Opportunity from "./opportunity";
export * as PortfolioMonitor from "./portfolio-monitor";
export * as LiveRiskEngine from "./risk/live-risk-engine";
export * as StrategyEngine from "./strategy";
export * as AgentEcosystem from "./agent-ecosystem";
export * as ContinuousAnalysis from "./continuous-analysis";
export * as StrategyLab from "./strategy-lab";
export * as AlphaEngine from "./alpha-engine";
