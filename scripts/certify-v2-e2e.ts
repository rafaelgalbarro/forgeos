/**
 * PROGRAM 6080 — TypeScript entry documentation for V2 E2E certification.
 *
 * Runtime certification is implemented in `scripts/certify-v2-e2e.js` so it can
 * run without a green project build / tsx. This file documents the fixture
 * contract for editors and future typed runners.
 *
 * Run: node scripts/certify-v2-e2e.js
 * Orchestrate: node scripts/run-v2-certification.js
 */

export const PROGRAM_6080 = "V2 END-TO-END CERTIFICATION" as const;

export const CERT_FIXTURE_PATH =
  "docs/architecture-v2/certification/fixtures/cert-6080-mission.json" as const;

export const CERT_MISSION_ID = "mission-cert-6080-aurora-ops" as const;

export type FlowStepStatus = "PASS" | "FAIL" | "SKIPPED" | "PARTIAL";

export type HonestyMarker =
  | "DEMO"
  | "ESTIMATED"
  | "DRY_RUN"
  | "HEURISTIC"
  | "MOCK"
  | "STUB"
  | "NOT_AUTOMATED";

export const REQUIRED_FLOW_STEPS = [
  "Intent",
  "Mission",
  "Decisions",
  "Plan",
  "Artifacts",
  "Outputs",
  "Codebases",
  "Builds",
  "Previews",
  "Release",
  "PreviewDeployment",
  "CompanyOS",
  "ChangeRequest",
  "ImpactAnalysis",
  "NewVersion",
  "NewBuild",
  "UpdatedPreview",
] as const;

export const CERTIFIED_DECLARATION = "FORGEOS V2 — END-TO-END CERTIFIED" as const;
export const BLOCKED_DECLARATION = "FORGEOS V2 — CERTIFICATION BLOCKED" as const;
