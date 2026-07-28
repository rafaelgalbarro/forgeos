/** Program 6500 — Production Readiness configuration (env-driven, dry-run default) */

export function isProductionMonitoringEnabled(): boolean {
  if (typeof process === "undefined") return true;
  return (
    process.env.ENABLE_PRODUCTION_MONITORING !== "false" &&
    process.env.NEXT_PUBLIC_ENABLE_PRODUCTION_MONITORING !== "false"
  );
}

export function isKillSwitchEnabled(): boolean {
  if (typeof process === "undefined") return false;
  return process.env.ENABLE_KILL_SWITCH === "true";
}

export function getProductionHealthEndpoint(): string | undefined {
  return process.env.PRODUCTION_HEALTH_ENDPOINT?.trim() || undefined;
}

export function isProductionDryRun(): boolean {
  if (typeof process === "undefined") return true;
  return process.env.PRODUCTION_DRY_RUN !== "false";
}

export function getProductionEnvironment(): string {
  return process.env.NODE_ENV ?? "development";
}

export function isStructuredLoggingEnabled(): boolean {
  return process.env.ENABLE_STRUCTURED_LOGGING === "true";
}

export function isTracingEnabled(): boolean {
  return process.env.ENABLE_PRODUCTION_TRACING === "true";
}

export function isMetricsCollectionEnabled(): boolean {
  return (
    process.env.ENABLE_PRODUCTION_METRICS === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_PRODUCTION_METRICS === "true"
  );
}

export function getRateLimitDefault(): number {
  const raw = process.env.PRODUCTION_RATE_LIMIT_PER_MINUTE;
  const n = raw ? parseInt(raw, 10) : 120;
  return Number.isFinite(n) ? n : 120;
}

export const PRODUCTION_STORAGE_KEYS = {
  alerts: "forgeos-production-alerts",
  incidents: "forgeos-production-incidents",
  releases: "forgeos-production-releases",
  errorLog: "forgeos-production-error-log",
  recoveryRuns: "forgeos-production-recovery-runs",
} as const;

export const REQUIRED_SECRETS = [
  { key: "AUTH_SECRET", category: "auth", required: false },
  { key: "STRIPE_SECRET_KEY", category: "billing", required: false },
  { key: "ANTHROPIC_API_KEY", category: "ai", required: false },
  { key: "OPENAI_API_KEY", category: "ai", required: false },
  { key: "DATABASE_URL", category: "persistence", required: false },
  { key: "GITHUB_TOKEN", category: "integrations", required: false },
] as const;
