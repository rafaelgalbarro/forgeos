/** Auth bridge — wires lib/auth to user repository. */

import type { UserPreferences } from "@/lib/workspace/types";
import type { StoredAuthUser } from "@/lib/workspace/store";
import { getUserRepository } from "../index";
import { scheduleAutosave } from "../autosave/autosave";
import { recordVersion } from "../versioning/versioning";

const userRepo = () => getUserRepository();

export async function bridgeGetStoredUsers(): Promise<StoredAuthUser[]> {
  return userRepo().findAll();
}

export async function bridgeSaveStoredUser(user: StoredAuthUser): Promise<StoredAuthUser> {
  const saved = await userRepo().save(user);
  scheduleAutosave("users", async () => {
    await userRepo().save(user);
  });
  void recordVersion("user", user.id, saved);
  return saved;
}

export async function bridgeFindUserByEmail(
  email: string
): Promise<StoredAuthUser | undefined> {
  const user = await userRepo().findByEmail(email);
  return user ?? undefined;
}

export async function bridgeGetPreferences(userId: string): Promise<UserPreferences> {
  return userRepo().getPreferences(userId);
}

export async function bridgeSavePreferences(
  userId: string,
  prefs: UserPreferences
): Promise<void> {
  await userRepo().savePreferences(userId, prefs);
  scheduleAutosave(`prefs:${userId}`, async () => {
    await userRepo().savePreferences(userId, prefs);
  });
}

/** Sync wrappers for legacy sync call sites. */
export function syncGetStoredUsers(): StoredAuthUser[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("forgeos-auth-users");
    return raw ? (JSON.parse(raw) as StoredAuthUser[]) : [];
  } catch {
    return [];
  }
}

export function syncSaveStoredUser(user: StoredAuthUser): void {
  const users = syncGetStoredUsers().filter(
    (u) => u.id !== user.id && u.email !== user.email
  );
  users.push(user);
  if (typeof window !== "undefined") {
    localStorage.setItem("forgeos-auth-users", JSON.stringify(users));
  }
  void bridgeSaveStoredUser(user);
}

export function syncFindUserByEmail(email: string): StoredAuthUser | undefined {
  return syncGetStoredUsers().find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
}
