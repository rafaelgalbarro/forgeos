/** Program 3000 — Workspace service. */

import {
  getOrganizations,
  getPreferences,
  getWorkspaceById,
  getWorkspaces,
  savePreferences,
  saveWorkspace,
} from "./store";
import type { ActiveWorkspaceContext, UserPreferences, Workspace } from "./types";
import { readSession } from "@/lib/auth/session-store";

export function getUserWorkspaces(userId: string): Workspace[] {
  return getWorkspaces().filter((w) => w.ownerId === userId);
}

export function getActiveWorkspace(): Workspace | null {
  const session = readSession();
  if (!session) return null;
  return getWorkspaceById(session.activeWorkspaceId) ?? null;
}

export function getActiveWorkspaceContext(): ActiveWorkspaceContext | null {
  const session = readSession();
  if (!session) return null;
  const workspace = getWorkspaceById(session.activeWorkspaceId);
  if (!workspace) return null;
  const org = getOrganizations().find((o) => o.id === workspace.organizationId);
  return {
    workspaceId: workspace.id,
    workspaceName: workspace.name,
    organizationId: workspace.organizationId,
    organizationName: org?.name ?? "Organization",
    userId: session.userId,
    userEmail: session.email,
    ventureIds: workspace.ventureIds,
    preferences: getPreferences(session.userId),
  };
}

export function updateWorkspace(workspaceId: string, patch: Partial<Pick<Workspace, "name" | "avatarUrl">>) {
  const ws = getWorkspaceById(workspaceId);
  if (!ws) return null;
  const updated: Workspace = {
    ...ws,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  saveWorkspace(updated);
  return updated;
}

export function linkVentureToWorkspace(workspaceId: string, ventureId: string) {
  const ws = getWorkspaceById(workspaceId);
  if (!ws) return null;
  if (ws.ventureIds.includes(ventureId)) return ws;
  const updated: Workspace = {
    ...ws,
    ventureIds: [...ws.ventureIds, ventureId],
    updatedAt: new Date().toISOString(),
  };
  saveWorkspace(updated);
  return updated;
}

export function updateUserPreferences(userId: string, prefs: Partial<UserPreferences>) {
  const current = getPreferences(userId);
  const next = { ...current, ...prefs };
  savePreferences(userId, next);
  return next;
}
