import type { InvestmentDecision, InvestmentReport, RiskAssessment } from "../domain";

export interface InvestmentDecisionViewModel {
  readonly recommendation: InvestmentDecision["recommendation"];
  readonly confidence: number;
  readonly reasoning: readonly string[];
  readonly risks: readonly string[];
  readonly evidence: readonly string[];
  readonly usedSources: readonly string[];
}

export interface RiskAssessmentViewModel {
  readonly level: RiskAssessment["level"];
  readonly concentrationRiskPct: number;
  readonly liquidityRiskPct: number;
  readonly expectedDrawdownPct: number;
  readonly factors: readonly string[];
}

export interface InvestmentReportViewModel {
  readonly generatedAt: string;
  readonly decision: InvestmentDecisionViewModel;
  readonly risk: RiskAssessmentViewModel;
  readonly allocation: InvestmentReport["allocationProposal"];
  readonly signalCount: number;
}
