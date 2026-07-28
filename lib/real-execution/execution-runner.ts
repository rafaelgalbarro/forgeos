/** ForgeOS Real Execution — orchestrator (RC5.1). */

import { generateDryRunPlan } from "@/lib/connections";
import {
  executeCapabilityConnection,
  isRealConnectionCapability,
} from "@/lib/connections/adapters/capability-connection-adapter";
import { redactObject } from "@/lib/connections/security/secret-redaction";
import type { ConnectionPlan, ConnectionResult } from "@/lib/connections/shared/types";
import { getCapabilityById } from "@/lib/capabilities/capability-registry";
import type { CapabilityContext } from "@/lib/capabilities/types";
import { buildExecutionRequest } from "./execution-request";
import { runExecutionGuard } from "./execution-guard";
import { auditExecutionAttempt } from "./execution-audit";
import {
  createApprovalSession,
  getApprovalSession,
  approveSession,
  rejectSession,
} from "./approval-session";
import type { ExecutionMode, ExecutionRequest, ExecutionResult } from "./types";
import { getPolicySummary } from "./execution-policy";

export interface DryRunInput {
  capabilityId: string;
  ventureId: string;
  requestedBy: string;
  action?: string;
  payload?: Record<string, unknown>;
}

export interface DryRunOutput {
  request: ExecutionRequest;
  dryRunResult: ConnectionResult;
  rollbackPlan?: ConnectionPlan;
}

export async function runDryRun(input: DryRunInput): Promise<DryRunOutput> {
  const request = buildExecutionRequest({
    capabilityId: input.capabilityId,
    ventureId: input.ventureId,
    requestedBy: input.requestedBy,
    action: input.action,
    payload: input.payload,
    mode: "dry_run",
  });

  const dryRunResult = await generateDryRunPlan(
    request.provider,
    request.operation,
    request.ventureId,
    request.requestedBy,
    request.payload
  );

  request.dryRunPlan = dryRunResult.plan;

  auditExecutionAttempt({
    requestId: request.requestId,
    capabilityId: request.capabilityId,
    provider: request.provider,
    operation: request.operation,
    ventureId: request.ventureId,
    requestedBy: request.requestedBy,
    mode: "dry_run",
    outcome: dryRunResult.success ? "dry_run" : "failed",
    gates: [],
    details: dryRunResult.output,
    riskLevel: request.risk?.level ?? "MEDIUM",
  });

  return {
    request,
    dryRunResult,
    rollbackPlan: dryRunResult.plan,
  };
}

export interface RequestApprovalInput extends DryRunInput {
  dryRunPlanId?: string;
}

export async function requestExecutionApproval(input: RequestApprovalInput) {
  const { request, dryRunResult } = await runDryRun(input);

  const session = createApprovalSession({
    capabilityId: request.capabilityId,
    provider: request.provider,
    operation: request.operation,
    ventureId: request.ventureId,
    requestedBy: request.requestedBy,
    riskLevel: request.risk?.level ?? "MEDIUM",
    requiredPermissions: request.requiredPermissions ?? [],
    dryRunPlanId: dryRunResult.plan?.planId ?? input.dryRunPlanId,
  });

  auditExecutionAttempt({
    requestId: request.requestId,
    capabilityId: request.capabilityId,
    provider: request.provider,
    operation: request.operation,
    ventureId: request.ventureId,
    requestedBy: request.requestedBy,
    mode: request.mode,
    outcome: "approval_requested",
    gates: [],
    details: `Approval session ${session.id} created`,
    riskLevel: request.risk?.level ?? "MEDIUM",
  });

  return {
    request,
    dryRunResult,
    session,
    requiredPermissions: request.requiredPermissions ?? [],
    risk: request.risk,
  };
}

export function approveExecution(sessionId: string, approvedBy: string, rationale?: string) {
  const session = approveSession(sessionId, approvedBy, rationale);
  if (!session) {
    throw new Error(`Approval session ${sessionId} not found`);
  }

  auditExecutionAttempt({
    requestId: session.id,
    capabilityId: session.capabilityId,
    provider: session.provider,
    operation: session.operation,
    ventureId: session.ventureId,
    requestedBy: session.requestedBy,
    approvedBy,
    mode: "sandbox",
    outcome: session.status === "approved" ? "approved" : "blocked",
    gates: [],
    details: session.rationale ?? "Approval resolved",
    riskLevel: session.riskLevel,
  });

  return session;
}

export function rejectExecution(sessionId: string, rejectedBy: string, rationale?: string) {
  const session = rejectSession(sessionId, rejectedBy, rationale);
  if (!session) {
    throw new Error(`Approval session ${sessionId} not found`);
  }

  auditExecutionAttempt({
    requestId: session.id,
    capabilityId: session.capabilityId,
    provider: session.provider,
    operation: session.operation,
    ventureId: session.ventureId,
    requestedBy: session.requestedBy,
    mode: "sandbox",
    outcome: "blocked",
    gates: [],
    details: session.rationale ?? "Rejected",
    riskLevel: session.riskLevel,
  });

  return session;
}

export interface ExecuteInput extends DryRunInput {
  approvalSessionId?: string;
  approvedBy?: string;
  mode?: ExecutionMode;
  userConfirmed?: boolean;
}

export async function executeRealAction(input: ExecuteInput): Promise<ExecutionResult> {
  const started = Date.now();

  let dryRunPlan: ConnectionPlan | undefined;
  if (input.approvalSessionId) {
    const session = getApprovalSession(input.approvalSessionId);
    if (session?.dryRunPlanId) {
      const dryRun = await runDryRun(input);
      dryRunPlan = dryRun.dryRunResult.plan;
    }
  }

  const request = buildExecutionRequest({
    capabilityId: input.capabilityId,
    ventureId: input.ventureId,
    requestedBy: input.requestedBy,
    action: input.action,
    payload: input.payload,
    mode: input.mode ?? "sandbox",
    approvalSessionId: input.approvalSessionId,
    dryRunPlan,
  });

  if (!dryRunPlan) {
    const dryRun = await generateDryRunPlan(
      request.provider,
      request.operation,
      request.ventureId,
      request.requestedBy,
      request.payload
    );
    dryRunPlan = dryRun.plan;
    request.dryRunPlan = dryRunPlan;
  }

  const guard = await runExecutionGuard(request);

  if (!guard.allPassed) {
    const audit = auditExecutionAttempt({
      requestId: request.requestId,
      capabilityId: request.capabilityId,
      provider: request.provider,
      operation: request.operation,
      ventureId: request.ventureId,
      requestedBy: request.requestedBy,
      approvedBy: input.approvedBy,
      mode: request.mode,
      outcome: "blocked",
      gates: guard.gates,
      details: guard.blockedReason ?? "Guard blocked execution",
      riskLevel: request.risk?.level ?? "MEDIUM",
    });

    return {
      requestId: request.requestId,
      success: false,
      executed: false,
      mode: request.mode,
      capabilityId: request.capabilityId,
      provider: request.provider,
      output: guard.blockedReason ?? "Execution blocked by guard",
      gates: guard.gates,
      allGatesPassed: false,
      blockedReason: guard.blockedReason,
      auditId: audit.id,
      approvalSessionId: input.approvalSessionId,
      risk: request.risk,
      rollbackPlan: dryRunPlan,
      latencyMs: Date.now() - started,
    };
  }

  if (!isRealConnectionCapability(request.capabilityId)) {
    throw new Error("Invalid capability for real execution");
  }

  const capability = getCapabilityById(request.capabilityId);
  const context: CapabilityContext = {
    ventureId: request.ventureId,
    requestedBy: request.requestedBy as CapabilityContext["requestedBy"],
    approvedBy: input.approvedBy as CapabilityContext["approvedBy"],
    action: request.operation,
    payload: request.payload,
  };

  const connectionMode =
    request.mode === "real" ? "sandbox" : request.mode === "sandbox" ? "sandbox" : "dry_run";

  const connectionResult = await executeCapabilityConnection({
    capabilityId: request.capabilityId,
    context,
    resolution: {
      capabilityId: request.capabilityId,
      primarySkillId: request.provider,
      provider: request.provider,
      policy: {
        id: "real-execution",
        maxCostPerCall: capability?.estimatedCost ?? 10,
        timeoutMs: 30000,
        requireApproval: true,
        allowedDepartments: capability?.authorizedDepartments ?? ["cto"],
        sandboxOnly: request.mode !== "real",
        auditLevel: "full",
      },
      approval: {
        required: true,
        approved: true,
        approvers: input.approvedBy ? [input.approvedBy as CapabilityContext["requestedBy"]] : [],
        rationale: "Real execution approval layer",
        signature: `forgeos-re-${request.requestId}`,
      },
      fallbackSkillIds: [],
      sandboxMode: request.mode !== "real",
      rationale: "RC5.1 real execution",
    },
    mode: connectionMode,
    userConfirmed: input.userConfirmed ?? false,
  });

  const safeResult = connectionResult
    ? (redactObject(connectionResult) as ConnectionResult)
    : undefined;
  const executed = safeResult?.executed ?? false;
  const success = safeResult?.success ?? false;

  const audit = auditExecutionAttempt({
    requestId: request.requestId,
    capabilityId: request.capabilityId,
    provider: request.provider,
    operation: request.operation,
    ventureId: request.ventureId,
    requestedBy: request.requestedBy,
    approvedBy: input.approvedBy,
    mode: request.mode,
    outcome: executed ? (success ? "executed" : "failed") : "blocked",
    gates: guard.gates,
    details: safeResult?.output ?? "No connection result",
    riskLevel: request.risk?.level ?? "MEDIUM",
  });

  return {
    requestId: request.requestId,
    success,
    executed,
    mode: request.mode,
    capabilityId: request.capabilityId,
    provider: request.provider,
    output: safeResult?.output ?? "Execution completed",
    connectionResult: safeResult,
    rollbackPlan: dryRunPlan,
    gates: guard.gates,
    allGatesPassed: true,
    blockedReason: safeResult?.blockedReason,
    auditId: audit.id,
    approvalSessionId: input.approvalSessionId,
    risk: request.risk,
    latencyMs: Date.now() - started,
  };
}

export function getRealExecutionOverview() {
  return getPolicySummary();
}
