/** Program 3000 Sprint 1 — Identity types. */

export type AuthProviderId = "local" | "supabase" | "authjs";

export type EmailVerificationStatus = "pending" | "verified";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  emailVerified: EmailVerificationStatus;
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
