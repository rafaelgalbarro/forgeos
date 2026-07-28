/** ForgeOS Real Execution — human approval sessions (RC5.1). */

import type { ConnectionProvider } from "@/lib/connections/shared/types";
import type { RealConnectionCapability } from "@/lib/connections/shared/types";
import type { ApprovalSession, ApprovalSessionStatus } from "./types";
import { isApprovalRequired } from "./execution-policy";

const SESSIONS = new Map<string, ApprovalSession>();
const SESSION_TTL_MS = 30 * 60 * 1000;
const MAX_SESSIONS = 200;

function pruneSessions() {
  if (SESSIONS.size <= MAX_SESSIONS) return;
  const sorted = [...SESSIONS.entries()].sort(
    (a, b) => new Date(a[1].createdAt).getTime() - new Date(b[1].createdAt).getTime()
  );
  while (SESSIONS.size > MAX_SESSIONS && sorted.length > 0) {
    const [id] = sorted.shift()!;
    SESSIONS.delete(id);
  }
}

function expireStaleSessions() {
  const now = Date.now();
  for (const [id, session] of SESSIONS) {
    if (session.status === "pending" && new Date(session.expiresAt).getTime() < now) {
      SESSIONS.set(id, { ...session, status: "expired", resolvedAt: new Date().toISOString() });
    }
  }
}

export function createApprovalSession(params: {
  capabilityId: RealConnectionCapability;
  provider: ConnectionProvider;
  operation: string;
  ventureId: string;
  requestedBy: string;
  riskLevel: string;
  requiredPermissions: string[];
  dryRunPlanId?: string;
}): ApprovalSession {
  expireStaleSessions();
  pruneSessions();

  const now = new Date();
  const session: ApprovalSession = {
    id: crypto.randomUUID(),
    capabilityId: params.capabilityId,
    provider: params.provider,
    operation: params.operation,
    ventureId: params.ventureId,
    requestedBy: params.requestedBy,
    status: isApprovalRequired() ? "pending" : "approved",
    riskLevel: params.riskLevel,
    requiredPermissions: params.requiredPermissions,
    dryRunPlanId: params.dryRunPlanId,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SESSION_TTL_MS).toISOString(),
    rationale: isApprovalRequired()
      ? "Awaiting human approval for real execution"
      : "Approval not required by policy",
  };

  if (!isApprovalRequired()) {
    session.approvedBy = "system";
    session.resolvedAt = now.toISOString();
  }

  SESSIONS.set(session.id, session);
  return session;
}

export function getApprovalSession(id: string): ApprovalSession | undefined {
  expireStaleSessions();
  return SESSIONS.get(id);
}

export function approveSession(id: string, approvedBy: string, rationale?: string): ApprovalSession | null {
  expireStaleSessions();
  const session = SESSIONS.get(id);
  if (!session) return null;
  if (session.status !== "pending") return session;

  const updated: ApprovalSession = {
    ...session,
    status: "approved",
    approvedBy,
    resolvedAt: new Date().toISOString(),
    rationale: rationale ?? `Approved by ${approvedBy}`,
  };
  SESSIONS.set(id, updated);
  return updated;
}

export function rejectSession(id: string, rejectedBy: string, rationale?: string): ApprovalSession | null {
  expireStaleSessions();
  const session = SESSIONS.get(id);
  if (!session) return null;
  if (session.status !== "pending") return session;

  const updated: ApprovalSession = {
    ...session,
    status: "rejected",
    rejectedBy,
    resolvedAt: new Date().toISOString(),
    rationale: rationale ?? `Rejected by ${rejectedBy}`,
  };
  SESSIONS.set(id, updated);
  return updated;
}

export function expireSession(id: string): ApprovalSession | null {
  const session = SESSIONS.get(id);
  if (!session) return null;
  if (session.status !== "pending") return session;

  const updated: ApprovalSession = {
    ...session,
    status: "expired",
    resolvedAt: new Date().toISOString(),
    rationale: "Session expired without approval",
  };
  SESSIONS.set(id, updated);
  return updated;
}

export function isSessionApproved(session: ApprovalSession | undefined): boolean {
  if (!session) return false;
  if (session.status === "expired" || session.status === "rejected") return false;
  if (!isApprovalRequired()) return true;
  return session.status === "approved";
}

export function listApprovalSessions(ventureId?: string): ApprovalSession[] {
  expireStaleSessions();
  const all = [...SESSIONS.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return ventureId ? all.filter((s) => s.ventureId === ventureId) : all;
}

export function getSessionStatusLabel(status: ApprovalSessionStatus): string {
  switch (status) {
    case "pending":
      return "Awaiting approval";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "expired":
      return "Expired";
  }
}
