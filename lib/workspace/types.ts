/** Program 3000 — Workspace & organization types. */

export interface UserPreferences {
  locale: string;
  theme: "system" | "light" | "dark";
  emailNotifications: boolean;
  aiCostAlerts: boolean;
  defaultOptimizer: "balanced" | "cost" | "quality" | "latency";
}

export interface WorkspaceOrganization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  organizationId: string;
  ownerId: string;
  ventureIds: string[];
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveWorkspaceContext {
  workspaceId: string;
  workspaceName: string;
  organizationId: string;
  organizationName: string;
  userId: string;
  userEmail: string;
  ventureIds: string[];
  preferences: UserPreferences;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  locale: "es",
  theme: "system",
  emailNotifications: true,
  aiCostAlerts: true,
  defaultOptimizer: "balanced",
};
