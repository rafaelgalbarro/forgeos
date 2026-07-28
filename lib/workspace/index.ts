/** Program 3000 — Workspace public API. */

export {
  getUserWorkspaces,
  getActiveWorkspace,
  getActiveWorkspaceContext,
  updateWorkspace,
  linkVentureToWorkspace,
  updateUserPreferences,
} from "./service";

export type {
  Workspace,
  WorkspaceOrganization,
  UserPreferences,
  ActiveWorkspaceContext,
} from "./types";

export { DEFAULT_PREFERENCES } from "./types";
