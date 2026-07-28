/** ForgeOS RC5.3 — execution safety rules. */

const BLOCKED_PATTERNS = [
  "delete",
  "destroy",
  "drop",
  "purge",
  "production",
  "prod_deploy",
  "apply_dns",
  "dns_apply",
  "payment",
  "charge",
  "stripe",
  "send_email",
  "newsletter",
  "campaign",
  "public_email",
  "expose_token",
  "log_api_key",
];

export interface SafetyCheckResult {
  safe: boolean;
  blockedReason?: string;
  category?: string;
}

export function checkExecutionSafety(
  operation: string,
  payload?: Record<string, unknown>
): SafetyCheckResult {
  if (process.env.REAL_EXECUTION_ALLOW_DESTRUCTIVE === "true") {
    return { safe: true };
  }

  const haystack = `${operation} ${JSON.stringify(payload ?? {})}`.toLowerCase();

  for (const pattern of BLOCKED_PATTERNS) {
    if (haystack.includes(pattern)) {
      return {
        safe: false,
        blockedReason: `Blocked pattern: ${pattern}`,
        category: pattern,
      };
    }
  }

  if (payload?.environment === "production" || payload?.target === "production") {
    return { safe: false, blockedReason: "Production target blocked", category: "production" };
  }

  return { safe: true };
}

export function listBlockedCategories(): string[] {
  return [
    "destructive (delete, destroy, drop)",
    "production deploy",
    "production database",
    "DNS apply",
    "payments",
    "public emails / campaigns",
    "secrets exposure",
  ];
}
