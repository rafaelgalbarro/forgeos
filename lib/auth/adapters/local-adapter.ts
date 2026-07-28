/** Program 3000 — Local auth adapter (default; no external deps). */

import type { AuthProvider } from "../provider-interface";
import type { AuthResult, AuthSession, RegisterInput } from "../types";
import { clearSession, readSession, writeSession } from "../session-store";
import {
  createId,
  findUserByEmail,
  getPreferences,
  getWorkspaceById,
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

const SESSION_DAYS = 14;

function buildSession(user: StoredAuthUser, workspaceId: string): AuthSession {
  const expires = new Date();
  expires.setDate(expires.getDate() + SESSION_DAYS);
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
    emailVerified: user.emailVerified,
    activeWorkspaceId: workspaceId,
    expiresAt: expires.toISOString(),
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

export const localAuthAdapter: AuthProvider = {
  id: "local",

  async register(input: RegisterInput): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase();
    if (!email || !input.password || input.password.length < 8) {
      return { success: false, error: "Email y contraseña (mín. 8 caracteres) requeridos." };
    }
    if (findUserByEmail(email)) {
      return { success: false, error: "Este email ya está registrado." };
    }

    const now = new Date().toISOString();
    const user: StoredAuthUser = {
      id: createId("user"),
      email,
      name: input.name.trim() || email.split("@")[0]!,
      passwordHash: await hashPassword(input.password),
      emailVerified: "pending",
      createdAt: now,
      updatedAt: now,
    };
    saveStoredUser(user);

    const verifyToken = createId("verify");
    saveVerifyToken(email, verifyToken);

    const workspaceId = provisionWorkspace(user, input.organizationName);
    const session = buildSession(user, workspaceId);
    writeSession(session);

    return {
      success: true,
      session,
      message: `Cuenta creada. Verifica tu email (demo token: ${verifyToken}).`,
    };
  },

  async login(input) {
    const user = findUserByEmail(input.email.trim());
    if (!user) return { success: false, error: "Credenciales incorrectas." };
    const hash = await hashPassword(input.password);
    if (hash !== user.passwordHash) return { success: false, error: "Credenciales incorrectas." };

    const workspaces = (await import("@/lib/workspace/store")).getWorkspaces().filter((w) => w.ownerId === user.id);
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
    const user = findUserByEmail(email.trim());
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
