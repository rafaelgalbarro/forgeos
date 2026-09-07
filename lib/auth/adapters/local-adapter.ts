/** Program 3000 — Local auth adapter (private Founder-only platform). */

import type { AuthProvider } from "../provider-interface";
import type { AuthResult, AuthSession, RegisterInput } from "../types";
import { clearSession, readSession, writeSession } from "../session-store";
import {
  founderPrivatePlatformMessage,
  getFounderUsername,
  isFounderIdentity,
  SESSION_INACTIVITY_MS,
} from "../founder";
import {
  createId,
  findUserByEmail,
  getStoredUsers,
  hashPassword,
  saveOrganization,
  savePreferences,
  saveResetToken,
  saveStoredUser,
  saveVerifyToken,
  saveWorkspace,
  slugify,
  consumeVerifyToken,
  type StoredAuthUser,
} from "@/lib/workspace/store";
import { DEFAULT_PREFERENCES } from "@/lib/workspace/types";

function buildSession(user: StoredAuthUser, workspaceId: string): AuthSession {
  const now = new Date();
  const expires = new Date(now.getTime() + SESSION_INACTIVITY_MS);
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    emailVerified: user.emailVerified,
    activeWorkspaceId: workspaceId,
    expiresAt: expires.toISOString(),
    lastActivityAt: now.toISOString(),
    role: user.role === "FOUNDER" || isFounderIdentity(user.email) ? "FOUNDER" : "USER",
    provider: "local",
  };
}

function provisionWorkspace(user: StoredAuthUser, organizationName?: string) {
  const orgName = organizationName?.trim() || `${user.name.split(" ")[0]} Org`;
  const orgId = createId("org");
  const wsId = createId("ws");
  const now = new Date().toISOString();

  saveOrganization({
    id: orgId,
    name: orgName,
    slug: slugify(orgName),
    ownerId: user.id,
    createdAt: now,
  });

  saveWorkspace({
    id: wsId,
    name: `${user.name.split(" ")[0]} Workspace`,
    slug: slugify(user.name),
    organizationId: orgId,
    ownerId: user.id,
    ventureIds: [],
    createdAt: now,
    updatedAt: now,
  });

  savePreferences(user.id, { ...DEFAULT_PREFERENCES });
  return wsId;
}

function resolveLoginEmail(raw: string): string {
  const id = raw.trim().toLowerCase();
  if (id.includes("@")) return id;
  // Username login → stable local email for Founder
  if (isFounderIdentity(id)) return `${getFounderUsername()}@forgeos.local`;
  return id;
}

function findFounderUser(): StoredAuthUser | undefined {
  return getStoredUsers().find(
    (u) => u.role === "FOUNDER" || isFounderIdentity(u.email) || isFounderIdentity(u.name),
  );
}

/** First-login bootstrap for Founder when no stored user exists yet. */
async function ensureFounderUser(loginRaw: string, password: string): Promise<StoredAuthUser | null> {
  if (!isFounderIdentity(loginRaw)) return null;
  const email = resolveLoginEmail(loginRaw);
  const existing =
    findFounderUser() ||
    findUserByEmail(email) ||
    findUserByEmail(loginRaw.trim()) ||
    findUserByEmail(`${getFounderUsername()}@forgeos.local`);
  if (existing) {
    if (existing.role !== "FOUNDER") {
      existing.role = "FOUNDER";
      existing.updatedAt = new Date().toISOString();
      saveStoredUser(existing);
    }
    return existing;
  }

  const now = new Date().toISOString();
  const user: StoredAuthUser = {
    id: createId("user"),
    email,
    name: getFounderUsername(),
    passwordHash: await hashPassword(password),
    emailVerified: "verified",
    role: "FOUNDER",
    createdAt: now,
    updatedAt: now,
  };
  saveStoredUser(user);
  return user;
}

export const localAuthAdapter: AuthProvider = {
  id: "local",

  async register(_input: RegisterInput): Promise<AuthResult> {
    return {
      success: false,
      error: founderPrivatePlatformMessage(),
      message: founderPrivatePlatformMessage(),
    };
  },

  async login(input) {
    if (!isFounderIdentity(input.email)) {
      return { success: false, error: founderPrivatePlatformMessage() };
    }

    let user =
      findFounderUser() ||
      findUserByEmail(input.email.trim()) ||
      findUserByEmail(resolveLoginEmail(input.email)) ||
      (await ensureFounderUser(input.email, input.password));

    if (!user) return { success: false, error: "Credenciales incorrectas." };

    // Existing Founder: verify password (bootstrap path already hashed matching password)
    const hash = await hashPassword(input.password);
    if (hash !== user.passwordHash) {
      // If we just created via ensureFounderUser in this call, hashes match.
      // Re-fetch after ensure path when user existed with wrong password.
      return { success: false, error: "Credenciales incorrectas." };
    }

    if (user.role !== "FOUNDER") {
      user.role = "FOUNDER";
      user.updatedAt = new Date().toISOString();
      saveStoredUser(user);
    }

    const workspaces = (await import("@/lib/workspace/store")).getWorkspaces().filter((w) => w.ownerId === user!.id);
    const workspaceId = workspaces[0]?.id;
    if (!workspaceId) {
      const wsId = provisionWorkspace(user);
      const session = buildSession(user, wsId);
      writeSession(session);
      return { success: true, session };
    }

    const session = buildSession(user, workspaceId);
    writeSession(session);
    return { success: true, session };
  },

  async logout() {
    clearSession();
  },

  async getSession() {
    return readSession();
  },

  async forgotPassword(email: string) {
    if (!isFounderIdentity(email)) {
      return {
        success: true,
        message: "Si el email existe, recibirás instrucciones.",
      };
    }
    const user =
      findUserByEmail(email.trim()) || findUserByEmail(resolveLoginEmail(email));
    const token = createId("reset");
    if (user) saveResetToken(user.email, token);
    return {
      success: true,
      message: user
        ? "Si el email existe, recibirás instrucciones (demo: usa el token mostrado)."
        : "Si el email existe, recibirás instrucciones.",
      demoToken: user ? token : undefined,
    };
  },

  async verifyEmail(token: string) {
    const email = consumeVerifyToken(token.trim());
    if (!email) return { success: false, message: "Token inválido o expirado." };
    const user = findUserByEmail(email);
    if (!user) return { success: false, message: "Usuario no encontrado." };
    user.emailVerified = "verified";
    user.updatedAt = new Date().toISOString();
    saveStoredUser(user);
    const session = readSession();
    if (session?.email === email) {
      writeSession({ ...session, emailVerified: "verified" });
    }
    return { success: true, message: "Email verificado correctamente." };
  },

  async updateProfile(userId, input) {
    const users = (await import("@/lib/workspace/store")).getStoredUsers();
    const user = users.find((u) => u.id === userId);
    if (!user) return { success: false, error: "Usuario no encontrado." };
    if (input.name) user.name = input.name.trim();
    if (input.avatarUrl !== undefined) user.avatarUrl = input.avatarUrl;
    user.updatedAt = new Date().toISOString();
    saveStoredUser(user);
    const session = readSession();
    if (session?.userId === userId) {
      const next = buildSession(user, session.activeWorkspaceId);
      writeSession(next);
      return { success: true, session: next };
    }
    return { success: true };
  },

  async resendVerificationEmail(email: string) {
    const user = findUserByEmail(email.trim());
    if (!user) return { success: true, message: "Si el email existe, se enviará verificación." };
    const token = createId("verify");
    saveVerifyToken(user.email, token);
    return { success: true, message: "Email de verificación reenviado (demo).", demoToken: token };
  },
};
