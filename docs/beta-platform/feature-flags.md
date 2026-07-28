# Feature Flags

Beta feature flags are stored in localStorage with per-user and per-workspace overrides.

## Default flags

| ID | Scope | Default |
|----|-------|---------|
| `venture-factory-v2` | workspace | off |
| `live-ai-streaming` | global | on |
| `founder-dashboard-pro` | user | off |
| `beta-analytics-panel` | global | on |
| `crash-reports-admin` | global | on |
| `autonomous-org-preview` | workspace | off |

## Usage

```ts
import { isFeatureEnabled, setFeatureFlagOverride } from "@/lib/beta-platform";

const enabled = isFeatureEnabled("venture-factory-v2", {
  userId: session.userId,
  workspaceId: session.activeWorkspaceId,
});

setFeatureFlagOverride("venture-factory-v2", true, {
  userId: session.userId,
  workspaceId: session.activeWorkspaceId,
});
```

## Resolution order

1. Workspace override (flagId + workspaceId)
2. User override (flagId + userId)
3. Global override (flagId only)
4. Flag default (`enabled` for global scope, `defaultValue` for user/workspace)

## UI

`FeatureFlagsPanel` in Beta Dashboard (`/beta` → Flags tab) toggles overrides and tracks `feature_flag_toggle` analytics events.

## Storage

- Flags: `forgeos-beta-feature-flags`
- Overrides: `forgeos-beta-flag-overrides`
