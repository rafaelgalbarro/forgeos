/** ForgeOS Real Execution — build execution requests (RC5.1). */

import {
  isRealConnectionCapability,
  resolveConnectionProvider,
} from "@/lib/connections/adapters/capability-connection-adapter";
import type { ConnectionPlan, RealConnectionCapability } from "@/lib/connections/shared/types";
import { assessSkillRisk } from "@/lib/skills-governance/risk-engine";
import { checkDepartmentPermission } from "@/lib/skills-governance/permission-engine";
import type { MeshDepartmentId } from "@/lib/executive-mesh/types";
import type { ExecutionMode, ExecutionRequest } from "./types";
import { getMaxModeForAction, isActionAllowed, isForbiddenAction } from "./execution-policy";

export interface BuildExecutionRequestInput {
  capabilityId: string;
  ventureId: string;
  requestedBy: string;
  action?: string;
  payload?: Record<string, unknown>;
  mode?: ExecutionMode;
  approvalSessionId?: string;
  dryRunPlan?: ConnectionPlan;
}

export function buildExecutionRequest(input: BuildExecutionRequestInput): ExecutionRequest {
  if (!isRealConnectionCapability(input.capabilityId)) {
    throw new Error(`Capability ${input.capabilityId} is not a real connection capability`);
  }

  const capabilityId = input.capabilityId as RealConnectionCapability;
  const provider = resolveConnectionProvider(capabilityId);
  if (!provider) {
    throw new Error(`No provider mapped for capability ${capabilityId}`);
  }

  const operation = input.action ?? capabilityId;
  const forbidden = isForbiddenAction(operation, input.payload);
  if (forbidden.forbidden) {
    throw new Error(forbidden.reason ?? "Forbidden action");
  }

  if (!isActionAllowed(capabilityId, operation)) {
    throw new Error(`Action ${operation} is not in the allowed real actions list`);
  }

  const maxMode = getMaxModeForAction(capabilityId, operation);
  const requestedMode = input.mode ?? "dry_run";
  const mode: ExecutionMode =
    requestedMode === "real" && maxMode !== "real" ? maxMode : requestedMode;

  const risk = assessSkillRisk(provider, operation);
  const permission = checkDepartmentPermission(
    input.requestedBy as MeshDepartmentId,
    provider,
    provider,
    input.ventureId,
    operation
  );

  const requiredPermissions = permission.matchedPermissions.flatMap((p) => p.scopes);

  return {
    requestId: crypto.randomUUID(),
    capabilityId,
    provider,
    operation,
    ventureId: input.ventureId,
    requestedBy: input.requestedBy,
    mode,
    payload: input.payload,
    approvalSessionId: input.approvalSessionId,
    dryRunPlan: input.dryRunPlan,
    risk,
    requiredPermissions,
  };
}
