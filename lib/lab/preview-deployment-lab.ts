/** PROGRAM 5380 — Preview deployment lab snapshot. */

import {
  getPreviewDeploymentFlagsSnapshot,
  getDeploymentHistory,
  listAllDeployments,
  runNexoraPreviewDeploymentE2E,
} from "@/lib/preview-deployment";
import { getPreviewDeploymentPolicy } from "@/lib/preview-deployment/config";
import { checkAllProviderHealthRc53 } from "@/lib/real-execution/providers/provider-health-check";
import { LAB_MOCK_VENTURE_ID, createLabMockVenture } from "@/lib/lab/mock-venture";
import type { PreviewDeploymentPolicy, PreviewDeploymentRequest, DeploymentHistoryEntry } from "@/lib/preview-deployment/types";
import type { ProviderHealthSnapshot } from "@/lib/real-execution/providers/provider-health-check";

export interface PreviewDeploymentLabSnapshot {
  policy: PreviewDeploymentPolicy;
  flags: ReturnType<typeof getPreviewDeploymentFlagsSnapshot>;
  venture: ReturnType<typeof createLabMockVenture>;
  deployments: PreviewDeploymentRequest[];
  history: DeploymentHistoryEntry[];
  providerHealth: ProviderHealthSnapshot[];
  nexoraE2E?: Awaited<ReturnType<typeof runNexoraPreviewDeploymentE2E>>;
}

export async function runPreviewDeploymentLab(): Promise<PreviewDeploymentLabSnapshot> {
  const policy = getPreviewDeploymentPolicy();
  const flags = getPreviewDeploymentFlagsSnapshot();
  const venture = createLabMockVenture();
  const providerHealth = await checkAllProviderHealthRc53();
  const deployments = listAllDeployments();
  const history = getDeploymentHistory();
  const nexoraE2E = await runNexoraPreviewDeploymentE2E();

  return {
    policy,
    flags,
    venture,
    deployments,
    history,
    providerHealth,
    nexoraE2E,
  };
}

export { LAB_MOCK_VENTURE_ID };
