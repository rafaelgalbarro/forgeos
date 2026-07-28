/**
 * Value stage catalog — entry/exit criteria, required evidence, experiments.
 * PROGRAM 6120
 */

import type { StageDefinition } from "./types";

export const VALUE_STAGE_DEFINITIONS: readonly StageDefinition[] = [
  {
    stage: "IDEA_VALUE",
    entryCriteria: ["Venture exists with idea summary", "At least one value hypothesis drafted"],
    requiredEvidence: ["RESEARCH_SOURCE"],
    exitCriteria: ["Problem hypothesis stated", "Target customer segment named"],
    blockingRisks: ["No problem hypothesis", "Idea only generates deliverables with no validation path"],
    recommendedExperiments: ["INTERVIEW", "LANDING_PAGE"],
    confidenceCeiling: 0.25,
  },
  {
    stage: "PROBLEM_VALIDATION",
    entryCriteria: ["Problem hypothesis stated", "Interview or research plan exists"],
    requiredEvidence: ["CUSTOMER_INTERVIEW", "SURVEY", "RESEARCH_SOURCE"],
    exitCriteria: ["Multiple confirmed problem statements from real sources"],
    blockingRisks: ["Interviews without provenance", "Vanity research without customers"],
    recommendedExperiments: ["INTERVIEW", "OUTREACH"],
    confidenceCeiling: 0.4,
  },
  {
    stage: "SOLUTION_VALIDATION",
    entryCriteria: ["Problem confirmed with evidence", "Solution hypothesis stated"],
    requiredEvidence: ["CUSTOMER_INTERVIEW", "DEMO_REQUEST", "LETTER_OF_INTENT"],
    exitCriteria: ["Purchase intent or LOI from real prospects"],
    blockingRisks: ["Building without confirmed problem", "Solution preference without customer pull"],
    recommendedExperiments: ["DEMO", "CONCIERGE_MVP", "PRICING_TEST"],
    confidenceCeiling: 0.5,
  },
  {
    stage: "PRODUCT_VALIDATION",
    entryCriteria: ["Solution pull evidenced", "MVP or concierge path defined"],
    requiredEvidence: ["PILOT", "ACTIVE_USER", "EXPERIMENT_RESULT"],
    exitCriteria: ["Pilot completed with documented outcome"],
    blockingRisks: ["Feature factory without usage evidence"],
    recommendedExperiments: ["PILOT", "PRODUCT_TEST", "CONCIERGE_MVP"],
    confidenceCeiling: 0.55,
  },
  {
    stage: "MARKET_VALIDATION",
    entryCriteria: ["Product used in context", "Go-to-market channel hypothesized"],
    requiredEvidence: ["LANDING_CONVERSION", "WAITLIST", "DEMO_REQUEST", "EXTERNAL_VALIDATION"],
    exitCriteria: ["Repeatable acquisition signal (not vanity)"],
    blockingRisks: ["Paid vanity traffic without intent", "Waitlist without conversion path"],
    recommendedExperiments: ["LANDING_PAGE", "WAITLIST", "PAID_CAMPAIGN", "OUTREACH"],
    confidenceCeiling: 0.6,
  },
  {
    stage: "LAUNCH_READINESS",
    entryCriteria: ["Market signal present", "Operating checklist defined"],
    requiredEvidence: ["OPERATIONAL_RESULT", "EXPERIMENT_RESULT"],
    exitCriteria: ["Launch criteria met with known blockers documented"],
    blockingRisks: ["Launch without support/ops readiness", "Missing cost visibility"],
    recommendedExperiments: ["PRODUCT_TEST", "UNIT_ECONOMICS_TEST"],
    confidenceCeiling: 0.65,
  },
  {
    stage: "TRACTION",
    entryCriteria: ["Launched or in market", "Usage/retention instruments active"],
    requiredEvidence: ["ACTIVE_USER", "RETENTION_EVENT", "DEMO_REQUEST"],
    exitCriteria: ["Sustained usage with retention evidence"],
    blockingRisks: ["Confusing signups with traction", "No retention measurement"],
    recommendedExperiments: ["RETENTION_TEST", "OUTREACH", "DEMO"],
    confidenceCeiling: 0.7,
  },
  {
    stage: "REVENUE",
    entryCriteria: ["Paying relationship possible", "Pricing hypothesis tested or live"],
    requiredEvidence: ["PAYING_CUSTOMER", "REVENUE_EVENT"],
    exitCriteria: ["Actual revenue events recorded (never estimated-as-actual)"],
    blockingRisks: ["Projected MRR treated as fact", "Invented customers"],
    recommendedExperiments: ["PRICING_TEST", "PILOT", "UNIT_ECONOMICS_TEST"],
    confidenceCeiling: 0.75,
  },
  {
    stage: "PROFITABILITY",
    entryCriteria: ["Actual revenue present", "Cost events tracked"],
    requiredEvidence: ["REVENUE_EVENT", "COST_EVENT", "OPERATIONAL_RESULT"],
    exitCriteria: ["Gross margin validated with ACTUAL cost + revenue"],
    blockingRisks: ["Ignoring AI/infra/human cost", "Target margins as facts"],
    recommendedExperiments: ["UNIT_ECONOMICS_TEST", "RETENTION_TEST"],
    confidenceCeiling: 0.85,
  },
  {
    stage: "SCALE",
    entryCriteria: ["Unit economics validated", "Repeatable ops"],
    requiredEvidence: ["OPERATIONAL_RESULT", "RETENTION_EVENT", "REVENUE_EVENT"],
    exitCriteria: ["Scalable acquisition + ops with measured economics"],
    blockingRisks: ["Scaling before retention", "Burn without runway visibility"],
    recommendedExperiments: ["PAID_CAMPAIGN", "RETENTION_TEST", "UNIT_ECONOMICS_TEST"],
    confidenceCeiling: 0.9,
  },
];

export function getStageDefinition(stage: StageDefinition["stage"]): StageDefinition {
  const found = VALUE_STAGE_DEFINITIONS.find((s) => s.stage === stage);
  if (!found) throw new Error(`Unknown value stage: ${stage}`);
  return found;
}

export function stageIndex(stage: StageDefinition["stage"]): number {
  return VALUE_STAGE_DEFINITIONS.findIndex((s) => s.stage === stage);
}
