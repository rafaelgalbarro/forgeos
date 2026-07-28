import type { FeatureFlag, FeatureFlagOverride } from "./types";
import { readStorage, writeStorage } from "./storage";
import { trackBetaEvent } from "./analytics";

const FLAGS_KEY = "forgeos-beta-feature-flags";
const OVERRIDES_KEY = "forgeos-beta-flag-overrides";

export const DEFAULT_FEATURE_FLAGS: FeatureFlag[] = [
  {
    id: "venture-factory-v2",
    name: "Venture Factory v2",
    description: "Nuevo pipeline de generación con multi-agente",
    enabled: false,
    scope: "workspace",
    defaultValue: false,
  },
  {
    id: "live-ai-streaming",
    name: "Live AI Streaming",
    description: "Streaming en tiempo real en Live Operations",
    enabled: true,
    scope: "global",
    defaultValue: true,
  },
  {
    id: "founder-dashboard-pro",
    name: "Founder Dashboard Pro",
    description: "KPIs avanzados y portfolio analytics",
    enabled: false,
    scope: "user",
    defaultValue: false,
  },
  {
    id: "beta-analytics-panel",
    name: "Beta Analytics Panel",
    description: "Panel de analytics de uso en beta dashboard",
    enabled: true,
    scope: "global",
    defaultValue: true,
  },
  {
    id: "crash-reports-admin",
    name: "Crash Reports Admin",
    description: "Vista admin de crash reports en dashboard",
    enabled: true,
    scope: "global",
    defaultValue: true,
  },
  {
    id: "autonomous-org-preview",
    name: "Autonomous Org Preview",
    description: "Preview de departamentos autónomos",
    enabled: false,
    scope: "workspace",
    defaultValue: false,
  },
];

let memoryFlags: FeatureFlag[] = [...DEFAULT_FEATURE_FLAGS];
let memoryOverrides: FeatureFlagOverride[] = [];

function readFlags(): FeatureFlag[] {
  if (typeof window === "undefined") return memoryFlags;
  const stored = readStorage<FeatureFlag[] | null>(FLAGS_KEY, null);
  if (stored) memoryFlags = stored;
  return memoryFlags;
}

function readOverrides(): FeatureFlagOverride[] {
  if (typeof window === "undefined") return memoryOverrides;
  const stored = readStorage<FeatureFlagOverride[]>(OVERRIDES_KEY, []);
  memoryOverrides = stored;
  return memoryOverrides;
}

function writeOverrides(overrides: FeatureFlagOverride[]): void {
  memoryOverrides = overrides;
  writeStorage(OVERRIDES_KEY, overrides);
}

export function listFeatureFlags(): FeatureFlag[] {
  return readFlags();
}

function resolveOverride(
  flagId: string,
  userId?: string,
  workspaceId?: string
): FeatureFlagOverride | undefined {
  const overrides = readOverrides();
  return (
    overrides.find((o) => o.flagId === flagId && o.workspaceId === workspaceId) ??
    overrides.find((o) => o.flagId === flagId && o.userId === userId && !o.workspaceId) ??
    overrides.find((o) => o.flagId === flagId && !o.userId && !o.workspaceId)
  );
}

export function isFeatureEnabled(
  flagId: string,
  context?: { userId?: string; workspaceId?: string }
): boolean {
  const flag = readFlags().find((f) => f.id === flagId);
  if (!flag) return false;

  const override = resolveOverride(flagId, context?.userId, context?.workspaceId);
  if (override) return override.enabled;

  if (flag.scope === "global") return flag.enabled;
  return flag.defaultValue;
}

export function setFeatureFlagOverride(
  flagId: string,
  enabled: boolean,
  context?: { userId?: string; workspaceId?: string }
): FeatureFlagOverride {
  const overrides = readOverrides().filter(
    (o) =>
      !(
        o.flagId === flagId &&
        o.userId === context?.userId &&
        o.workspaceId === context?.workspaceId
      )
  );

  const override: FeatureFlagOverride = {
    flagId,
    enabled,
    userId: context?.userId,
    workspaceId: context?.workspaceId,
    updatedAt: new Date().toISOString(),
  };

  writeOverrides([...overrides, override]);

  trackBetaEvent({
    event: "feature_flag_toggle",
    userId: context?.userId,
    workspaceId: context?.workspaceId,
    meta: { flagId, enabled: String(enabled) },
  });

  return override;
}

export function getResolvedFlags(context?: {
  userId?: string;
  workspaceId?: string;
}): Array<FeatureFlag & { resolved: boolean }> {
  return readFlags().map((flag) => ({
    ...flag,
    resolved: isFeatureEnabled(flag.id, context),
  }));
}

export function resetFeatureFlagOverrides(): void {
  memoryOverrides = [];
  if (typeof window !== "undefined") {
    localStorage.removeItem(OVERRIDES_KEY);
  }
}
