import type { OrgInvitation, WorkspaceInvitation } from "./types";
import { readStorage, writeStorage } from "./storage";
import {
  listInvitationCodes,
  redeemInvitation,
  validateInvitationCode,
  getInvitationRedemption,
} from "@/lib/beta-platform/invitations";
import { trackBetaEvent } from "@/lib/beta-platform/analytics";

const ORG_KEY = "forgeos-dp-org-invitations";
const WS_KEY = "forgeos-dp-workspace-invitations";

const DEMO_ORG_INVITES: OrgInvitation[] = [
  {
    id: "org-inv-1",
    orgId: "org-forge-demo",
    orgName: "ForgeOS Design Partners",
    email: "partner@forgeos.local",
    code: "FORGE-ORG-DP2026",
    status: "pending",
    invitedBy: "system",
    createdAt: "2026-07-01T00:00:00.000Z",
  },
];

const DEMO_WS_INVITES: WorkspaceInvitation[] = [
  {
    id: "ws-inv-1",
    workspaceId: "ws-partner-alpha",
    workspaceName: "Partner Alpha Workspace",
    email: "alpha@forgeos.local",
    code: "FORGE-WS-ALPHA",
    role: "admin",
    status: "pending",
    invitedBy: "system",
    createdAt: "2026-07-01T00:00:00.000Z",
  },
];

let memoryOrg: OrgInvitation[] = [...DEMO_ORG_INVITES];
let memoryWs: WorkspaceInvitation[] = [...DEMO_WS_INVITES];

function readOrg(): OrgInvitation[] {
  if (typeof window === "undefined") return memoryOrg;
  const stored = readStorage<OrgInvitation[] | null>(ORG_KEY, null);
  if (stored) memoryOrg = stored;
  return memoryOrg;
}

function writeOrg(invites: OrgInvitation[]): void {
  memoryOrg = invites;
  writeStorage(ORG_KEY, invites);
}

function readWs(): WorkspaceInvitation[] {
  if (typeof window === "undefined") return memoryWs;
  const stored = readStorage<WorkspaceInvitation[] | null>(WS_KEY, null);
  if (stored) memoryWs = stored;
  return memoryWs;
}

function writeWs(invites: WorkspaceInvitation[]): void {
  memoryWs = invites;
  writeStorage(WS_KEY, invites);
}

export function listOrgInvitations(): OrgInvitation[] {
  return readOrg();
}

export function listWorkspaceInvitations(): WorkspaceInvitation[] {
  return readWs();
}

export function getPendingInviteCount(): number {
  const org = readOrg().filter((i) => i.status === "pending").length;
  const ws = readWs().filter((i) => i.status === "pending").length;
  return org + ws;
}

export function createOrgInvitation(input: {
  orgId: string;
  orgName: string;
  email: string;
  invitedBy?: string;
}): OrgInvitation {
  const invite: OrgInvitation = {
    id: `org-inv-${Date.now()}`,
    orgId: input.orgId,
    orgName: input.orgName,
    email: input.email.trim(),
    code: `FORGE-ORG-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    status: "pending",
    invitedBy: input.invitedBy,
    createdAt: new Date().toISOString(),
  };
  writeOrg([...readOrg(), invite]);
  return invite;
}

export function createWorkspaceInvitation(input: {
  workspaceId: string;
  workspaceName: string;
  email: string;
  role?: WorkspaceInvitation["role"];
  invitedBy?: string;
}): WorkspaceInvitation {
  const invite: WorkspaceInvitation = {
    id: `ws-inv-${Date.now()}`,
    workspaceId: input.workspaceId,
    workspaceName: input.workspaceName,
    email: input.email.trim(),
    code: `FORGE-WS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
    role: input.role ?? "member",
    status: "pending",
    invitedBy: input.invitedBy,
    createdAt: new Date().toISOString(),
  };
  writeWs([...readWs(), invite]);
  return invite;
}

export function acceptOrgInvitation(code: string, email?: string): {
  success: boolean;
  error?: string;
  invite?: OrgInvitation;
} {
  const normalized = code.trim().toUpperCase();
  const invites = readOrg();
  const idx = invites.findIndex((i) => i.code === normalized && i.status === "pending");
  if (idx === -1) {
    const beta = validateInvitationCode(code);
    if (beta) {
      const result = redeemInvitation(code, email);
      if (result.success) {
        trackBetaEvent({ event: "invitation_redeem", label: code });
      }
      return { success: result.success, error: result.error };
    }
    return { success: false, error: "Invitación de organización inválida o expirada." };
  }

  const updated = [...invites];
  updated[idx] = {
    ...updated[idx],
    status: "accepted",
    acceptedAt: new Date().toISOString(),
    email: email?.trim() || updated[idx].email,
  };
  writeOrg(updated);
  trackBetaEvent({ event: "invitation_redeem", label: normalized, meta: { type: "org" } });
  return { success: true, invite: updated[idx] };
}

export function acceptWorkspaceInvitation(code: string, email?: string): {
  success: boolean;
  error?: string;
  invite?: WorkspaceInvitation;
} {
  const normalized = code.trim().toUpperCase();
  const invites = readWs();
  const idx = invites.findIndex((i) => i.code === normalized && i.status === "pending");
  if (idx === -1) {
    return { success: false, error: "Invitación de workspace inválida o expirada." };
  }

  const updated = [...invites];
  updated[idx] = {
    ...updated[idx],
    status: "accepted",
    acceptedAt: new Date().toISOString(),
    email: email?.trim() || updated[idx].email,
  };
  writeWs(updated);
  trackBetaEvent({ event: "invitation_redeem", label: normalized, meta: { type: "workspace" } });
  return { success: true, invite: updated[idx] };
}

export { listInvitationCodes, getInvitationRedemption, validateInvitationCode, redeemInvitation };
