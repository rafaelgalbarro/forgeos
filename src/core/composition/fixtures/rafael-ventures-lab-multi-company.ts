/**
 * PROGRAM 6150 — RAFAEL VENTURES LAB multi-company operational fixture.
 * Aligns venture names with Program 6120 value-engine fixture.
 * Generic fixture data only — not hardcoded into production engines.
 *
 * Note: composition/fixtures/rafael-ventures-lab.ts re-exports the 6120
 * portfolio identity. This file holds 6150 scenario roles + deliverables.
 */

import { ORBITA_SPORTS_FIXTURE } from "./orbita-sports";

export type MultiCompanyVentureRole =
  | "SIMULTANEOUS_A"
  | "SIMULTANEOUS_B"
  | "SIMULTANEOUS_C"
  | "VALIDATION"
  | "PAUSED";

export type MultiCompanyVentureFixture = Readonly<{
  name: string;
  slug: string;
  description: string;
  missionFocus: readonly string[];
  role: MultiCompanyVentureRole;
  lifecycle: "BUILDING" | "VALIDATING" | "PAUSED";
  priority: "CRITICAL" | "HIGH" | "NORMAL" | "LOW" | "PAUSED";
  deliverables: Readonly<{
    website: boolean;
    application: boolean;
    backend: boolean;
    databaseSchema: boolean;
    apiContract: boolean;
    preview: boolean;
    release: boolean;
  }>;
}>;

export const TABLEFLOW_FIXTURE: MultiCompanyVentureFixture = {
  name: "TABLEFLOW",
  slug: "tableflow",
  description:
    "Operations table OS for multi-location teams — reservations, floor plans, staff shifts, and service SLAs.",
  missionFocus: ["reservations", "floor-plans", "shifts", "sla", "ops-metrics"] as const,
  role: "SIMULTANEOUS_A",
  lifecycle: "BUILDING",
  priority: "HIGH",
  deliverables: {
    website: true,
    application: true,
    backend: true,
    databaseSchema: true,
    apiContract: true,
    preview: true,
    release: true,
  },
};

export const LUXORA_EYEWEAR_FIXTURE: MultiCompanyVentureFixture = {
  name: "LUXORA EYEWEAR",
  slug: "luxora-eyewear",
  description:
    "DTC premium eyewear brand with virtual try-on, prescription capture, and fulfillment tracking.",
  missionFocus: ["catalog", "try-on", "prescription", "checkout", "fulfillment"] as const,
  role: "SIMULTANEOUS_B",
  lifecycle: "BUILDING",
  priority: "HIGH",
  deliverables: {
    website: true,
    application: false,
    backend: true,
    databaseSchema: true,
    apiContract: true,
    preview: true,
    release: false,
  },
};

export const LOCALGROW_AI_FIXTURE: MultiCompanyVentureFixture = {
  name: "LOCALGROW AI",
  slug: "localgrow-ai",
  description:
    "AI advisor for local growers — crop planning, demand signals, and co-op distribution.",
  missionFocus: ["crop-plan", "demand", "co-op", "advisories"] as const,
  role: "SIMULTANEOUS_C",
  lifecycle: "BUILDING",
  priority: "NORMAL",
  deliverables: {
    website: false,
    application: true,
    backend: true,
    databaseSchema: true,
    apiContract: true,
    preview: true,
    release: false,
  },
};

export const CREATORPULSE_FIXTURE: MultiCompanyVentureFixture = {
  name: "CREATORPULSE",
  slug: "creatorpulse",
  description:
    "Creator analytics and monetization pulse — audience health, offer experiments, payout readiness.",
  missionFocus: ["audience", "offers", "experiments", "payouts"] as const,
  role: "VALIDATION",
  lifecycle: "VALIDATING",
  priority: "NORMAL",
  deliverables: {
    website: false,
    application: false,
    backend: false,
    databaseSchema: false,
    apiContract: false,
    preview: false,
    release: false,
  },
};

export const ORBITA_SPORTS_MULTI_FIXTURE: MultiCompanyVentureFixture = {
  name: ORBITA_SPORTS_FIXTURE.name,
  slug: ORBITA_SPORTS_FIXTURE.slug,
  description: ORBITA_SPORTS_FIXTURE.description,
  missionFocus: ORBITA_SPORTS_FIXTURE.missionFocus,
  role: "PAUSED",
  lifecycle: "PAUSED",
  priority: "PAUSED",
  deliverables: {
    website: false,
    application: false,
    backend: false,
    databaseSchema: false,
    apiContract: false,
    preview: false,
    release: false,
  },
};

/** Five companies for Program 6150 multi-company operational certification. */
export const RAFAEL_VENTURES_LAB_MULTI_COMPANY_VENTURES = [
  TABLEFLOW_FIXTURE,
  LUXORA_EYEWEAR_FIXTURE,
  LOCALGROW_AI_FIXTURE,
  CREATORPULSE_FIXTURE,
  ORBITA_SPORTS_MULTI_FIXTURE,
] as const;

export const RAFAEL_VENTURES_LAB_MULTI_COMPANY = {
  name: "RAFAEL VENTURES LAB",
  slug: "rafael-ventures-lab",
  workspaceName: "RAFAEL VENTURES LAB Workspace",
  workspaceSlug: "rafael-ventures-lab-ws",
  portfolioId: "portfolio-rafael-ventures-lab",
  description:
    "Certification portfolio proving ForgeOS multi-company creation, concurrent operation, value measurement, and isolation.",
  ventures: RAFAEL_VENTURES_LAB_MULTI_COMPANY_VENTURES,
  policies: {
    MAX_ACTIVE_VENTURES: 8,
    MAX_SIMULTANEOUS_BUILDS: 3,
    MAX_ACTIVE_PREVIEWS: 3,
  },
  workspaceLimits: {
    AI_EXECUTION: 30,
    BUILD_WORKER: 6,
    PREVIEW_SANDBOX: 3,
    TOKEN_BUDGET: 1_000_000,
  },
} as const;

export type RafaelVenturesLabMultiCompanyFixture = typeof RAFAEL_VENTURES_LAB_MULTI_COMPANY;
