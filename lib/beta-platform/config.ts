/** Program 3000 Sprint 6 — Beta platform configuration */

export function isBetaMode(): boolean {
  return process.env.BETA_MODE !== "false" && process.env.NEXT_PUBLIC_BETA_MODE !== "false";
}

export function isBetaAnalyticsEnabled(): boolean {
  return (
    process.env.ENABLE_BETA_ANALYTICS === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_BETA_ANALYTICS === "true"
  );
}

export function isCrashReportsEnabled(): boolean {
  return (
    process.env.ENABLE_CRASH_REPORTS === "true" ||
    process.env.NEXT_PUBLIC_ENABLE_CRASH_REPORTS === "true"
  );
}

export function getBetaAnalyticsEndpoint(): string | undefined {
  return process.env.BETA_ANALYTICS_ENDPOINT?.trim() || undefined;
}
