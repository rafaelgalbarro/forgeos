/** ForgeOS Build Pipeline Lab — Sprint 5 snapshot. */

import {
  getBuildPipelinePolicy,
  getBuildPipelineSnapshot,
  getPipelineAuditLog,
} from "@/lib/build-pipeline";
import { getExecutionFlagsSnapshot } from "@/lib/real-build-flow";
import { checkAllProviderHealthRc53 } from "@/lib/real-execution/providers/provider-health-check";
import { LAB_MOCK_VENTURE_ID, createLabMockVenture } from "@/lib/lab/mock-venture";
import type { BuildPipelinePolicy, BuildPipelineSnapshot } from "@/lib/build-pipeline/types";
import type { ExecutionFlagsSnapshot } from "@/lib/real-build-flow/execution-flags";
import type { ProviderHealthSnapshot } from "@/lib/real-execution/providers/provider-health-check";
import type { PipelineAuditEntry } from "@/lib/build-pipeline/types";

export interface BuildPipelineLabSnapshot {
  policy: BuildPipelinePolicy;
  flags: ExecutionFlagsSnapshot;
  venture: ReturnType<typeof createLabMockVenture>;
  pipeline: BuildPipelineSnapshot | null;
  providerHealth: ProviderHealthSnapshot[];
  audit: PipelineAuditEntry[];
}

export async function runBuildPipelineLab(): Promise<BuildPipelineLabSnapshot> {
  const policy = getBuildPipelinePolicy();
  const flags = getExecutionFlagsSnapshot();
  const venture = createLabMockVenture();
  const providerHealth = await checkAllProviderHealthRc53();

  let pipeline: BuildPipelineSnapshot | null = null;
  try {
    pipeline = await getBuildPipelineSnapshot(LAB_MOCK_VENTURE_ID, "cto");
  } catch {
    pipeline = null;
  }

  return {
    policy,
    flags,
    venture,
    pipeline,
    providerHealth,
    audit: getPipelineAuditLog(LAB_MOCK_VENTURE_ID),
  };
}
