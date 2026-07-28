/** Default deployment rules for generated software (Epic 6.1). */

import type { DeploymentRules } from "./types";

export const DEFAULT_DEPLOYMENT_RULES: DeploymentRules = {
  environments: ["development", "staging", "production"],
  rollbackStrategy: "Instant rollback via Vercel deployment alias; database migrations reversible",
  rules: [
    "Preview deployments for every pull request",
    "Staging mirrors production configuration (minus secrets)",
    "Production deploys require passing CI and manual approval",
    "Health checks must pass before traffic shift",
    "Structured logging and error reporting enabled in all environments",
  ],
};
