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
export { readSession, clearSession, updateSession, touchSession } from "./session-store";
export { AUTH_COOKIE_NAME, isAuthCookieValid } from "./session-cookie";
export {
  getFounderUsername,
  isFounderIdentity,
  founderPrivatePlatformMessage,
  SESSION_INACTIVITY_MS,
} from "./founder";
export type { AuthRole } from "./founder";

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
