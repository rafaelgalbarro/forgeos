/** Program 3000 — Auth provider interface (no vendor coupling). */

import type {
  AuthResult,
  AuthSession,
  ForgotPasswordResult,
  LoginInput,
  ProfileUpdateInput,
  RegisterInput,
  VerifyEmailResult,
} from "./types";

export interface AuthProvider {
  readonly id: string;
  login(input: LoginInput): Promise<AuthResult>;
  register(input: RegisterInput): Promise<AuthResult>;
  logout(): Promise<void>;
  getSession(): Promise<AuthSession | null>;
  forgotPassword(email: string): Promise<ForgotPasswordResult>;
  verifyEmail(token: string): Promise<VerifyEmailResult>;
  updateProfile(userId: string, input: ProfileUpdateInput): Promise<AuthResult>;
  resendVerificationEmail(email: string): Promise<ForgotPasswordResult>;
}
