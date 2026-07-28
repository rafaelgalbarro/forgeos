/** Program 3000 Sprint 1 — Identity Platform public API. */

export { AUTH_VERSION, getAuthProviderId, isAuthEnabled } from "./config";
export {
  login,
  register,
  logout,
  getSession,
  forgotPassword,
  verifyEmail,
  updateProfile,
  resendVerificationEmail,
  setActiveWorkspace,
} from "./auth-service";
export { getAuthProvider } from "./auth-factory";
export { readSession, clearSession, updateSession } from "./session-store";
export { mergeWorkspaceIntoAiContext, workspaceContextFromActive } from "./ai-context-bridge";
export type {
  AuthUser,
  AuthSession,
  AuthProviderId,
  RegisterInput,
  LoginInput,
  AuthResult,
  ProfileUpdateInput,
} from "./types";
