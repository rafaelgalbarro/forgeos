import type { InvestmentDecision, InvestmentReport, RiskAssessment } from "../domain";
import type {
  InvestmentDecisionViewModel,
  InvestmentReportViewModel,
  RiskAssessmentViewModel,
} from "./dto";

export function toInvestmentDecisionViewModel(
  decision: InvestmentDecision,
): InvestmentDecisionViewModel {
  return {
    recommendation: decision.recommendation,
    confidence: decision.confidence,
    reasoning: decision.reasoning,
    risks: decision.risks,
    evidence: decision.evidence,
    usedSources: decision.usedSources,
  };
}

export function toRiskAssessmentViewModel(risk: RiskAssessment): RiskAssessmentViewModel {
  return {
    level: risk.level,
    concentrationRiskPct: risk.concentrationRiskPct,
    liquidityRiskPct: risk.liquidityRiskPct,
    expectedDrawdownPct: risk.expectedDrawdownPct,
    factors: risk.factors,
  };
}

export function toInvestmentReportViewModel(report: InvestmentReport): InvestmentReportViewModel {
  return {
    generatedAt: report.generatedAt,
    decision: toInvestmentDecisionViewModel(report.decision),
    risk: toRiskAssessmentViewModel(report.riskAssessment),
    allocation: report.allocationProposal,
    signalCount: report.signals.length,
  };
}
