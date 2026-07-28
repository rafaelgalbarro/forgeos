/** Program 3000 — Auth service (public API). */

import { getAuthProvider } from "./auth-factory";
import type { LoginInput, ProfileUpdateInput, RegisterInput } from "./types";
import { updateSession } from "./session-store";

const provider = () => getAuthProvider();

export async function login(input: LoginInput) {
  return provider().login(input);
}

export async function register(input: RegisterInput) {
  return provider().register(input);
}

export async function logout() {
  return provider().logout();
}

export async function getSession() {
  return provider().getSession();
}

export async function forgotPassword(email: string) {
  return provider().forgotPassword(email);
}

export async function verifyEmail(token: string) {
  return provider().verifyEmail(token);
}

export async function updateProfile(userId: string, input: ProfileUpdateInput) {
  return provider().updateProfile(userId, input);
}

export async function resendVerificationEmail(email: string) {
  return provider().resendVerificationEmail(email);
}

export function setActiveWorkspace(workspaceId: string) {
  return updateSession({ activeWorkspaceId: workspaceId });
}
