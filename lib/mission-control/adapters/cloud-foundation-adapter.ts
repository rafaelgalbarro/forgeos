/** Thin adapter — Cloud Foundation public API. */

export async function getCloudDeploymentHint(): Promise<{ ready: boolean; summary: string }> {
  const { buildCloudDashboardSnapshot } = await import("@/lib/cloud-foundation");
  const snap = await buildCloudDashboardSnapshot();
  return {
    ready: snap.health.overallStatus !== "critical",
    summary: `Despliegue: ${snap.deployment.status}`,
  };
}

export async function getDeploymentSnapshot(): Promise<{ status: string }> {
  const { buildDeploymentSnapshot } = await import("@/lib/cloud-foundation");
  const snap = await buildDeploymentSnapshot();
  return { status: snap.status ?? "preview" };
}
