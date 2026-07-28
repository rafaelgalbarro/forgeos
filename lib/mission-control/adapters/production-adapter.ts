/** Thin adapter — Production Readiness public API. */

export async function getProductionHealthHint(): Promise<{ score: number; label: string }> {
  const { buildProductionHealthCenterSnapshot } = await import("@/lib/production-readiness");
  const snap = await buildProductionHealthCenterSnapshot();
  const scoreMap: Record<string, number> = { healthy: 90, degraded: 60, critical: 30, unknown: 50 };
  return {
    score: scoreMap[snap.overallStatus] ?? 50,
    label: snap.overallStatus ?? "unknown",
  };
}

export async function canDeployMission(): Promise<boolean> {
  const { canDeploy } = await import("@/lib/production-readiness");
  return canDeploy();
}
