/** Workspace bridge — wires lib/workspace to persistence repositories. */

import type { UserPreferences, Workspace, WorkspaceOrganization } from "@/lib/workspace/types";
import {
  getOrganizationRepository,
  getUserRepository,
  getWorkspaceRepository,
} from "../index";
import { scheduleAutosave } from "../autosave/autosave";
import { recordVersion } from "../versioning/versioning";

const wsRepo = () => getWorkspaceRepository();
const orgRepo = () => getOrganizationRepository();
const userRepo = () => getUserRepository();

// ── Sync API (backward-compatible with lib/workspace/store.ts) ───

export function getOrganizations(): WorkspaceOrganization[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("forgeos-organizations");
    return raw ? (JSON.parse(raw) as WorkspaceOrganization[]) : [];
  } catch {
    return [];
  }
}

export function saveOrganization(org: WorkspaceOrganization): void {
  const list = getOrganizations().filter((o) => o.id !== org.id);
  list.push(org);
  if (typeof window !== "undefined") {
    localStorage.setItem("forgeos-organizations", JSON.stringify(list));
  }
  void orgRepo().save(org);
  scheduleAutosave("organizations", async () => {
    await orgRepo().save(org);
  });
  void recordVersion("organization", org.id, org);
}

export function getWorkspaces(): Workspace[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("forgeos-workspaces");
    return raw ? (JSON.parse(raw) as Workspace[]) : [];
  } catch {
    return [];
  }
}

export function saveWorkspace(ws: Workspace): void {
  const list = getWorkspaces().filter((w) => w.id !== ws.id);
  list.push(ws);
  if (typeof window !== "undefined") {
    localStorage.setItem("forgeos-workspaces", JSON.stringify(list));
  }
  void wsRepo().save(ws);
  scheduleAutosave("workspaces", async () => {
    await wsRepo().save(ws);
  });
  void recordVersion("workspace", ws.id, ws);
}

export function getWorkspaceById(id: string): Workspace | undefined {
  return getWorkspaces().find((w) => w.id === id);
}

export function getPreferences(userId: string): UserPreferences {
  if (typeof window === "undefined") {
    return {
      locale: "es",
      theme: "system",
      emailNotifications: true,
      aiCostAlerts: true,
      defaultOptimizer: "balanced",
    };
  }
  try {
    const raw = localStorage.getItem("forgeos-user-preferences");
    const all = raw ? (JSON.parse(raw) as Record<string, UserPreferences>) : {};
    return (
      all[userId] ?? {
        locale: "es",
        theme: "system",
        emailNotifications: true,
        aiCostAlerts: true,
        defaultOptimizer: "balanced",
      }
    );
  } catch {
    return {
      locale: "es",
      theme: "system",
      emailNotifications: true,
      aiCostAlerts: true,
      defaultOptimizer: "balanced",
    };
  }
}

export function savePreferences(userId: string, prefs: UserPreferences): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem("forgeos-user-preferences");
    const all = raw ? (JSON.parse(raw) as Record<string, UserPreferences>) : {};
    all[userId] = prefs;
    localStorage.setItem("forgeos-user-preferences", JSON.stringify(all));
  } catch {
    // noop
  }
  void userRepo().savePreferences(userId, prefs);
}

// ── Async API (repository-native) ────────────────────────────────

export async function asyncGetWorkspaces(): Promise<Workspace[]> {
  return wsRepo().findAll();
}

export async function asyncSaveWorkspace(ws: Workspace): Promise<Workspace> {
  return wsRepo().save(ws);
}

export async function asyncGetOrganizations(): Promise<WorkspaceOrganization[]> {
  return orgRepo().findAll();
}

export async function asyncSaveOrganization(
  org: WorkspaceOrganization
): Promise<WorkspaceOrganization> {
  return orgRepo().save(org);
}
