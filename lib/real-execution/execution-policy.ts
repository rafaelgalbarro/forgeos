/** ForgeOS Real Execution — policy gates (RC5.1). */

import type { ConnectionProvider } from "@/lib/connections/shared/types";
import type { AllowedAction, ExecutionMode, ForbiddenAction } from "./types";

const DEFAULT_ALLOWED_PROVIDERS: ConnectionProvider[] = [
  "github",
  "vercel",
  "supabase",
  "cloudflare",
];

export const ALLOWED_REAL_ACTIONS: AllowedAction[] = [
  {
    capabilityId: "create_repository",
    provider: "github",
    operation: "create_repository",
    description: "Create private repository (non-destructive)",
    maxMode: "sandbox",
  },
  {
    capabilityId: "create_branch",
    provider: "github",
    operation: "create_branch",
    description: "Create feature branch (no push to main)",
    maxMode: "sandbox",
  },
  {
    capabilityId: "open_pull_request",
    provider: "github",
    operation: "open_pull_request",
    description: "Open test pull request (no merge to main)",
    maxMode: "sandbox",
  },
  {
    capabilityId: "create_environment",
    provider: "vercel",
    operation: "create_environment",
    description: "Create preview project environment",
    maxMode: "sandbox",
  },
  {
    capabilityId: "deploy_software",
    provider: "vercel",
    operation: "deploy_software",
    description: "Prepare preview deployment (no production deploy)",
    maxMode: "sandbox",
  },
  {
    capabilityId: "create_database",
    provider: "supabase",
    operation: "create_database",
    description: "Create sandbox project / prepare migrations",
    maxMode: "sandbox",
  },
  {
    capabilityId: "configure_domain",
    provider: "cloudflare",
    operation: "configure_domain",
    description: "Validate zone and prepare DNS plan (no apply)",
    maxMode: "dry_run",
  },
];

export const FORBIDDEN_ACTION_PATTERNS: ForbiddenAction[] = [
  { pattern: "delete", reason: "Destructive delete operations blocked", category: "destructive" },
  { pattern: "drop", reason: "Database drop operations blocked", category: "destructive" },
  { pattern: "destroy", reason: "Destroy operations blocked", category: "destructive" },
  { pattern: "purge", reason: "Purge operations blocked", category: "destructive" },
  { pattern: "wipe", reason: "Wipe operations blocked", category: "destructive" },
  { pattern: "remove_repo", reason: "Repository deletion blocked", category: "destructive" },
  { pattern: "push_main", reason: "Push to main branch blocked", category: "production" },
  { pattern: "push_to_main", reason: "Push to main branch blocked", category: "production" },
  { pattern: "merge_main", reason: "Merge to main blocked from real execution", category: "production" },
  { pattern: "production_deploy", reason: "Production deployment blocked by default", category: "production" },
  { pattern: "production", reason: "Production environment execution blocked by default", category: "production" },
  { pattern: "apply_dns", reason: "Real DNS apply blocked — plan only", category: "dns" },
  { pattern: "dns_apply", reason: "Real DNS apply blocked — plan only", category: "dns" },
  { pattern: "expose_token", reason: "Credential exposure blocked", category: "credential" },
  { pattern: "prod_table", reason: "Production table mutations blocked", category: "production" },
];

export function isRealExecutionEnabled(): boolean {
  return process.env.ENABLE_REAL_EXECUTION === "true";
}

export function getAllowedProviders(): ConnectionProvider[] {
  const raw = process.env.REAL_EXECUTION_ALLOWED_PROVIDERS ?? "github,vercel,supabase,cloudflare";
  const parsed = raw
    .split(",")
    .map((p) => p.trim())
    .filter((p): p is ConnectionProvider =>
      (DEFAULT_ALLOWED_PROVIDERS as readonly string[]).includes(p)
    );
  return parsed.length > 0 ? parsed : DEFAULT_ALLOWED_PROVIDERS;
}

export function isApprovalRequired(): boolean {
  return process.env.REAL_EXECUTION_REQUIRE_APPROVAL !== "false";
}

export function isProviderAllowed(provider: ConnectionProvider): boolean {
  return getAllowedProviders().includes(provider);
}

export function isActionAllowed(capabilityId: string, operation: string): boolean {
  return ALLOWED_REAL_ACTIONS.some(
    (a) => a.capabilityId === capabilityId || a.operation === operation
  );
}

export function getMaxModeForAction(capabilityId: string, operation: string): ExecutionMode {
  const match = ALLOWED_REAL_ACTIONS.find(
    (a) => a.capabilityId === capabilityId || a.operation === operation
  );
  return match?.maxMode ?? "dry_run";
}

export function isForbiddenAction(operation: string, payload?: Record<string, unknown>): {
  forbidden: boolean;
  reason?: string;
} {
  const haystack = `${operation} ${JSON.stringify(payload ?? {})}`.toLowerCase();

  for (const rule of FORBIDDEN_ACTION_PATTERNS) {
    if (haystack.includes(rule.pattern.toLowerCase())) {
      return { forbidden: true, reason: rule.reason };
    }
  }

  if (payload?.base === "main" && /push|merge|force/i.test(operation)) {
    return { forbidden: true, reason: "Push/merge to main branch blocked" };
  }

  if (payload?.environment === "production" || payload?.target === "production") {
    return { forbidden: true, reason: "Production target blocked by default" };
  }

  return { forbidden: false };
}

export function isEnvironmentPermitted(mode: ExecutionMode): boolean {
  if (mode === "dry_run" || mode === "sandbox") return true;
  if (mode === "real") return isRealExecutionEnabled();
  return true;
}

export function getPolicySummary() {
  return {
    realExecutionEnabled: isRealExecutionEnabled(),
    allowedProviders: getAllowedProviders(),
    approvalRequired: isApprovalRequired(),
    allowedActions: ALLOWED_REAL_ACTIONS,
    forbiddenPatterns: FORBIDDEN_ACTION_PATTERNS.map((f) => f.pattern),
  };
}
