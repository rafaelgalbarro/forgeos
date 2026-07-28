/** ForgeOS Real Execution Lab — RC5.1. */

import {
  runDryRun,
  requestExecutionApproval,
  getRealExecutionOverview,
  getExecutionAuditLog,
  listApprovalSessions,
  ALLOWED_REAL_ACTIONS,
  FORBIDDEN_ACTION_PATTERNS,
} from "@/lib/real-execution";
import { getExecutionFlagsSnapshot } from "@/lib/real-build-flow/execution-flags";
import { checkAllProviderHealth } from "@/lib/connections/security/connection-health";
import type { ApprovalSession, ExecutionAuditEntry } from "@/lib/real-execution/types";
import type { ConnectionHealthStatus } from "@/lib/connections/shared/types";
import type { RealConnectionCapability } from "@/lib/connections/shared/types";

export interface RealExecutionLabSnapshot {
  policy: ReturnType<typeof getRealExecutionOverview>;
  flags: ReturnType<typeof getExecutionFlagsSnapshot>;
  allowedActions: typeof ALLOWED_REAL_ACTIONS;
  forbiddenPatterns: typeof FORBIDDEN_ACTION_PATTERNS;
  health: ConnectionHealthStatus[];
  sessions: ApprovalSession[];
  audit: ExecutionAuditEntry[];
  sampleDryRun: Awaited<ReturnType<typeof runDryRun>> | null;
}

export async function runRealExecutionLab(
  ventureId = "demo-venture-vandl"
): Promise<RealExecutionLabSnapshot> {
  const policy = getRealExecutionOverview();
  const flags = getExecutionFlagsSnapshot();
  const health = await checkAllProviderHealth();
  const sessions = listApprovalSessions(ventureId);
  const audit = getExecutionAuditLog(ventureId);

  let sampleDryRun: Awaited<ReturnType<typeof runDryRun>> | null = null;
  try {
    sampleDryRun = await runDryRun({
      capabilityId: "create_repository" as RealConnectionCapability,
      ventureId,
      requestedBy: "cto",
      payload: { name: "forgeos-rc51-demo", private: true },
    });
  } catch {
    sampleDryRun = null;
  }

  return {
    policy,
    flags,
    allowedActions: ALLOWED_REAL_ACTIONS,
    forbiddenPatterns: FORBIDDEN_ACTION_PATTERNS,
    health,
    sessions,
    audit,
    sampleDryRun,
  };
}

export { runDryRun, requestExecutionApproval };
