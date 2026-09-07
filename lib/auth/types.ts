/** Program 3000 Sprint 1 — Identity types. */

import type { AuthRole } from "./founder";

export type AuthProviderId = "local" | "supabase" | "authjs";

export type EmailVerificationStatus = "pending" | "verified";

export type { AuthRole };

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  emailVerified: EmailVerificationStatus;
  role?: AuthRole;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  emailVerified: EmailVerificationStatus;
  activeWorkspaceId: string;
  expiresAt: string;
  /** Sliding inactivity window — updated on activity. */
  lastActivityAt: string;
  role: AuthRole;
  provider: AuthProviderId;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  organizationName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  session?: AuthSession;
  error?: string;
  message?: string;
}

export interface ProfileUpdateInput {
  name?: string;
  avatarUrl?: string;
}

export interface ForgotPasswordResult {
  success: boolean;
  message: string;
  /** Demo token for local provider verify flow */
  demoToken?: string;
}

export interface VerifyEmailResult {
  success: boolean;
  message: string;
}
