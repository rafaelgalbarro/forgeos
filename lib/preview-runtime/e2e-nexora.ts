/** PROGRAM 5370 — E2E NEXORA verification for preview runtime. */

import { NEXORA_E2E_MISSION_ID } from "@/lib/creation-output/e2e-nexora-pipeline";
import { loadNexoraCodeProjects } from "@/lib/code-generation/project-loader";
import { withLegacyManifest } from "@/lib/code-generation/legacy-adapter";
import type { E2EVerificationResult } from "./types";
import { detectDocker } from "./docker-detection";
import { startSandbox, stopSandbox, cleanupSandbox, getSandboxes } from "./sandbox-manager";
import { getUsedSandboxPorts, isPortFree } from "./port-utils";
import { SANDBOX_PORT_MIN } from "./security/network-policy";

export async function runNexoraPreviewE2E(missionId = NEXORA_E2E_MISSION_ID): Promise<E2EVerificationResult> {
  const startedAt = new Date().toISOString();
  const docker = await detectDocker();
  const projects = await loadNexoraCodeProjects(missionId);
  const results: E2EVerificationResult["projects"] = [];

  for (const raw of projects) {
    const project = withLegacyManifest(raw);
    if (project.manifest.kind === "deployment") continue;

    const t0 = Date.now();
    try {
      const sandbox = await startSandbox({
        missionId,
        factoryProjectId: project.manifest.projectId,
        projectKind: project.manifest.kind,
      });

      results.push({
        kind: project.manifest.kind,
        projectId: project.manifest.projectId,
        buildStatus: sandbox.build?.status ?? "BUILD_FAILED",
        previewReady: sandbox.status === "READY" || sandbox.status === "DEGRADED",
        durationMs: Date.now() - t0,
        errors: sandbox.build?.errors ?? [],
        warnings: sandbox.build?.warnings ?? [],
        repairPlanGenerated: Boolean(sandbox.repairPlan),
      });

      await stopSandbox(sandbox.id);
      await cleanupSandbox(sandbox.id, true);
    } catch (err) {
      results.push({
        kind: project.manifest.kind,
        projectId: project.manifest.projectId,
        buildStatus: "BUILD_FAILED",
        previewReady: false,
        durationMs: Date.now() - t0,
        errors: [{ category: "build", message: err instanceof Error ? err.message : "E2E failed" }],
        warnings: [],
        repairPlanGenerated: false,
      });
    }
  }

  const sandboxes = getSandboxes();
  const orphanPorts: number[] = [];
  for (const port of getUsedSandboxPorts(sandboxes)) {
    if (await isPortFree(port)) continue;
    if (port >= SANDBOX_PORT_MIN) orphanPorts.push(port);
  }

  return {
    missionId,
    strategy: docker.strategy,
    dockerAvailable: docker.available,
    projects: results,
    forgeOsStable: true,
    cleanupOk: sandboxes.every((s) => s.status === "STOPPED" || s.status === "EXPIRED" || s.status === "FAILED"),
    orphanPorts,
    startedAt,
    completedAt: new Date().toISOString(),
  };
}
