/**
 * Composition fixtures for RAFAEL VENTURES LAB.
 * - Program 6110/6150 operational fixture
 * - Program 6120 value-engine certification fixture
 */

export const RAFAEL_VENTURES_LAB_PORTFOLIO_ID = "portfolio-rafael-ventures-lab" as const;

export const RAFAEL_VENTURES_LAB_FIXTURE = {
  workspaceName: "RAFAEL VENTURES LAB Workspace",
  workspaceSlug: "rafael-ventures-lab-ws",
  portfolioName: "RAFAEL VENTURES LAB",
  portfolioSlug: "rafael-ventures-lab",
  portfolioId: RAFAEL_VENTURES_LAB_PORTFOLIO_ID,
  workspaceLimits: {
    AI_EXECUTION: 30,
    BUILD_WORKER: 6,
    PREVIEW_SANDBOX: 3,
    TOKEN_BUDGET: 1_000_000,
  },
  ventures: [
    { name: "ORBITA SPORTS", slug: "orbita-sports", idea: "Sports club operating system", priority: "HIGH" as const, lifecycle: "BUILDING" as const },
    { name: "TABLEFLOW", slug: "tableflow", idea: "Restaurant table & floor operations flow", priority: "HIGH" as const, lifecycle: "BUILDING" as const },
    { name: "LUXORA EYEWEAR", slug: "luxora-eyewear", idea: "Premium eyewear D2C landing validation", priority: "NORMAL" as const, lifecycle: "BUILDING" as const },
    { name: "LOCALGROW AI", slug: "localgrow-ai", idea: "Local business growth AI assistant", priority: "NORMAL" as const, lifecycle: "VALIDATING" as const },
    { name: "CREATORPULSE", slug: "creatorpulse", idea: "Creator analytics pulse", priority: "LOW" as const, lifecycle: "DISCOVERING" as const },
  ],
  sharedDependency: { description: "TABLEFLOW reuses ORBITA auth patterns (technical dependency)" },
  controlledFailureVentureSlug: "luxora-eyewear",
} as const;

export const RAFAEL_VENTURES_LAB = RAFAEL_VENTURES_LAB_FIXTURE.ventures;

export const RAFAEL_VENTURES_LAB_VALUE_FIXTURE = {
  portfolioId: "rafael-ventures-lab",
  ventures: [
    { id: "venture-orbita-sports", name: "ORBITA SPORTS", currency: "EUR", profile: "strong opportunity, no validation", stageHint: "IDEA_VALUE", knownFacts: { evidence: ["RESEARCH_SOURCE"] } },
    { id: "venture-tableflow", name: "TABLEFLOW", currency: "EUR", profile: "customer interviews", stageHint: "PROBLEM_VALIDATION", knownFacts: { evidence: ["CUSTOMER_INTERVIEW"] } },
    { id: "venture-luxora-eyewear", name: "LUXORA EYEWEAR", currency: "EUR", profile: "landing and signups", stageHint: "MARKET_VALIDATION", knownFacts: { evidence: ["LANDING_CONVERSION", "WAITLIST"] } },
    { id: "venture-localgrow-ai", name: "LOCALGROW AI", currency: "EUR", profile: "pilot", stageHint: "PRODUCT_VALIDATION", knownFacts: { evidence: ["PILOT"] } },
    { id: "venture-creatorpulse", name: "CREATORPULSE", currency: "EUR", profile: "blocked by lack of evidence", stageHint: "IDEA_VALUE", knownFacts: { evidence: [] } },
  ],
} as const;

export const RAFAEL_VENTURES_LAB_MULTI_COMPANY = RAFAEL_VENTURES_LAB_FIXTURE;
export const RAFAEL_VENTURES_LAB_MULTI_COMPANY_VENTURES = RAFAEL_VENTURES_LAB_FIXTURE.ventures;

export type RafaelVenturesLabValueFixture = typeof RAFAEL_VENTURES_LAB_VALUE_FIXTURE;
