/** PROGRAM 5800 — Investor Mode public API. */

export type * from "./types";
export { INVESTOR_MODE_VERSION, INVESTOR_STORAGE_PREFIX } from "./types";

export { buildInvestorModeSnapshot, investorReadinessLabel } from "./investor-snapshots";
export {
  generateInvestorPackage,
  readInvestorPackage,
  writeInvestorPackage,
  updateMissionInvestorSnapshot,
} from "./investor-orchestrator";
export { detectInvestorIntent, shouldTriggerInvestorMode, investorIntentReply } from "./investor-intent";
export { fetchVentureIntelligenceContext, buildVentureIntelligenceContextSync } from "./adapters/venture-intelligence-adapter";
export { computeInvestorReadinessScore } from "./investor-readiness-scorer";
export { generateDataRoom } from "./data-room-generator";
export { generateInvestorDeck } from "./investor-deck-generator";
export { generateFinancialModel } from "./financial-model-generator";
export { generateValuationSummary } from "./valuation-summary-generator";
export { generateDueDiligenceChecklist } from "./due-diligence-checklist";
export { generateInvestorFAQ } from "./investor-faq-generator";
export { generateFundingPlan } from "./funding-plan-generator";
