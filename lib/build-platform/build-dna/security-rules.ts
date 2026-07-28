/** Default security rules for generated software (Epic 6.1). */

import type { SecurityRules } from "./types";

export const DEFAULT_SECURITY_RULES: SecurityRules = {
  rules: [
    "Never commit secrets or credentials to source control",
    "Validate and sanitize all user input at API boundaries",
    "Use parameterized queries — no string-concatenated SQL",
    "Apply least-privilege IAM for cloud resources",
    "Enforce HTTPS everywhere; HSTS in production",
    "Rate-limit authentication and write endpoints",
  ],
  oauthRequired: true,
  encryptDataAtRest: true,
  encryptDataInTransit: true,
};
