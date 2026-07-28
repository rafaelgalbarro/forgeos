/** RC8 — Investment engine (heuristic, dry-run). */

import type { VentureFinancialInputs } from "./types";
import { HEURISTIC_DISCLAIMER } from "./types";
import { estimateValuation } from "./valuation-engine";
import { estimateFundraisingNeed } from "./fundraising-engine";
import { assessInvestorReadiness } from "./due-diligence-engine";

export interface InvestmentAnalysis {
  valuationEur: number;
  fundingNeedEur: number;
  investorReadinessPct: number;
  recommendedRound: string;
  investmentThesis: string;
  disclaimer: typeof HEURISTIC_DISCLAIMER;
}

export function analyzeInvestment(inputs: VentureFinancialInputs): InvestmentAnalysis {
  const valuation = estimateValuation(inputs);
  const fundraising = estimateFundraisingNeed(inputs);
  const readiness = assessInvestorReadiness(inputs);

  const dilutionEstimate = Math.round(
    (fundraising.amountNeededEur / (valuation.amountEur + fundraising.amountNeededEur)) * 100
  );

  return {
    valuationEur: valuation.amountEur,
    fundingNeedEur: fundraising.amountNeededEur,
    investorReadinessPct: readiness.score,
    recommendedRound: fundraising.targetRound,
    investmentThesis: `Ronda ${fundraising.targetRound} de ~${fundraising.amountNeededEur.toLocaleString("es-ES")} € con dilución estimada ~${dilutionEstimate}% [${HEURISTIC_DISCLAIMER}]`,
    disclaimer: HEURISTIC_DISCLAIMER,
  };
}
