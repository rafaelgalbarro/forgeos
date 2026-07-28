/** ForgeOS Real Build Flow Lab — RC5.2 + RC5.3. */

import {
  getBuildFlowPolicySummary,
  runBuildFlowDryRun,
  getBuildFlowAuditLog,
  getExecutionFlagsSnapshot,
} from "@/lib/real-build-flow";
import { checkAllProviderHealthRc53 } from "@/lib/real-execution/providers/provider-health-check";
import { getExecutionAuditLog } from "@/lib/real-execution";
import { LAB_MOCK_VENTURE_ID, createLabMockVenture } from "@/lib/lab/mock-venture";
import type { BuildFlowDryRunResult, BuildFlowPolicySummary } from "@/lib/real-build-flow/types";
import type { BuildFlowAuditEntry } from "@/lib/real-build-flow/types";
import type { ExecutionFlagsSnapshot } from "@/lib/real-build-flow/execution-flags";
import type { ProviderHealthSnapshot } from "@/lib/real-execution/providers/provider-health-check";
import type { ExecutionAuditEntry } from "@/lib/real-execution/types";

export interface RealBuildFlowLabSnapshot {
  policy: BuildFlowPolicySummary;
  flags: ExecutionFlagsSnapshot;
  venture: ReturnType<typeof createLabMockVenture>;
  sampleDryRun: BuildFlowDryRunResult | null;
  audit: BuildFlowAuditEntry[];
  executionAudit: ExecutionAuditEntry[];
  providerHealth: ProviderHealthSnapshot[];
}

export async function runRealBuildFlowLab(): Promise<RealBuildFlowLabSnapshot> {
  const policy = getBuildFlowPolicySummary();
  const flags = getExecutionFlagsSnapshot();
  const venture = createLabMockVenture();
  const providerHealth = await checkAllProviderHealthRc53();

  let sampleDryRun: BuildFlowDryRunResult | null = null;
  try {
    sampleDryRun = await runBuildFlowDryRun({
      ventureId: LAB_MOCK_VENTURE_ID,
      venture,
      requestedBy: "cto",
    });
  } catch {
    sampleDryRun = null;
  }

  return {
    policy,
    flags,
    venture,
    sampleDryRun,
    audit: getBuildFlowAuditLog(LAB_MOCK_VENTURE_ID),
    executionAudit: getExecutionAuditLog(LAB_MOCK_VENTURE_ID),
    providerHealth,
  };
}
