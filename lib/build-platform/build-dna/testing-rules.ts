/** Default testing rules for generated software (Epic 6.1). */

import type { TestingRules } from "./types";

export const DEFAULT_TESTING_RULES: TestingRules = {
  unitCoverageMin: 70,
  integrationRequired: true,
  e2eRequired: true,
  rules: [
    "Unit tests for domain logic and pure utilities",
    "Integration tests for API routes and data access",
    "E2E tests for critical user journeys (auth, checkout, core flow)",
    "No tests that only assert framework boilerplate",
    "CI must pass all tests before merge",
  ],
};
