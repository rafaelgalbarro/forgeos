import type { InvestmentDecision, InvestmentReport, MarketSignal, MarketSnapshot, PortfolioSnapshot } from "../domain";
import { produceInvestmentDecision, produceInvestmentReport } from "./use-cases";

export interface AnalyzeInvestmentRequest {
  readonly marketSnapshot: MarketSnapshot;
  readonly portfolioSnapshot: PortfolioSnapshot;
  readonly signals: readonly MarketSignal[];
}

export interface InvestmentAnalysisService {
  analyze(request: AnalyzeInvestmentRequest): InvestmentDecision;
  generateReport(request: AnalyzeInvestmentRequest): InvestmentReport;
}

export function createInvestmentAnalysisService(): InvestmentAnalysisService {
  return {
    analyze(request) {
      return produceInvestmentDecision(request);
    },
    generateReport(request) {
      return produceInvestmentReport(request);
    },
  };
}
