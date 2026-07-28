/** Program 3000 — Workspace persistence (client-side; swappable for DB). */

import {
  syncFindUserByEmail,
  syncGetStoredUsers,
  syncSaveStoredUser,
} from "@/lib/persistence/bridges/auth-bridge";
import {
  getOrganizations as bridgeGetOrganizations,
  getPreferences as bridgeGetPreferences,
  getWorkspaceById as bridgeGetWorkspaceById,
  getWorkspaces as bridgeGetWorkspaces,
  saveOrganization as bridgeSaveOrganization,
  savePreferences as bridgeSavePreferences,
  saveWorkspace as bridgeSaveWorkspace,
} from "@/lib/persistence/bridges/workspace-bridge";
import { type UserPreferences, type Workspace, type WorkspaceOrganization } from "./types";

const VERIFY_KEY = "forgeos-email-verify-tokens";
const RESET_KEY = "forgeos-password-reset-tokens";

export interface StoredAuthUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  avatarUrl?: string;
  emailVerified: "pending" | "verified";
  createdAt: string;
  updatedAt: string;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

export async function hashPassword(password: string): Promise<string> {
  if (typeof window === "undefined" || !crypto.subtle) {
    return `demo:${password.length}`;
  }
  const data = new TextEncoder().encode(password);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function getStoredUsers(): StoredAuthUser[] {
  return syncGetStoredUsers();
}

export function saveStoredUser(user: StoredAuthUser): void {
  syncSaveStoredUser(user);
}

export function findUserByEmail(email: string): StoredAuthUser | undefined {
  return syncFindUserByEmail(email);
}

export function getOrganizations(): WorkspaceOrganization[] {
  return bridgeGetOrganizations();
}

export function saveOrganization(org: WorkspaceOrganization): void {
  bridgeSaveOrganization(org);
}

export function getWorkspaces(): Workspace[] {
  return bridgeGetWorkspaces();
}

export function saveWorkspace(ws: Workspace): void {
  bridgeSaveWorkspace(ws);
}

export function getWorkspaceById(id: string): Workspace | undefined {
  return bridgeGetWorkspaceById(id);
}

export function getPreferences(userId: string): UserPreferences {
  return bridgeGetPreferences(userId);
}

export function savePreferences(userId: string, prefs: UserPreferences): void {
  bridgeSavePreferences(userId, prefs);
}

export function saveVerifyToken(email: string, token: string): void {
  const all = readJson<Record<string, string>>(VERIFY_KEY, {});
  all[email.toLowerCase()] = token;
  writeJson(VERIFY_KEY, all);
}

export function consumeVerifyToken(token: string): string | null {
  const all = readJson<Record<string, string>>(VERIFY_KEY, {});
  const entry = Object.entries(all).find(([, t]) => t === token);
  if (!entry) return null;
  delete all[entry[0]];
  writeJson(VERIFY_KEY, all);
  return entry[0];
}

export function saveResetToken(email: string, token: string): void {
  const all = readJson<Record<string, string>>(RESET_KEY, {});
  all[email.toLowerCase()] = token;
  writeJson(RESET_KEY, all);
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "workspace";
}

export function createId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}
