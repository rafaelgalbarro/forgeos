"use client";

import { Badge } from "@/components/ui/fhis/Badge";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { setFeatureFlagOverride } from "@/lib/beta-platform";
import type { FeatureFlag } from "@/lib/beta-platform";
import { readSession } from "@/lib/auth/session-store";

interface FeatureFlagsPanelProps {
  flags: Array<FeatureFlag & { resolved: boolean }>;
  onUpdate?: () => void;
}

export function FeatureFlagsPanel({ flags, onUpdate }: FeatureFlagsPanelProps) {
  function toggle(flagId: string, enabled: boolean) {
    const session = readSession();
    setFeatureFlagOverride(flagId, enabled, {
      userId: session?.userId,
      workspaceId: session?.activeWorkspaceId,
    });
    onUpdate?.();
  }

  return (
    <Stack gap="sm">
      {flags.map((flag) => (
        <Panel key={flag.id} className="fhis-beta-flag-row">
          <div className="fhis-beta-flag-head">
            <div>
              <strong>{flag.name}</strong>
              <Badge variant="default">{flag.scope}</Badge>
            </div>
            <label className="fhis-beta-toggle">
              <input
                type="checkbox"
                checked={flag.resolved}
                onChange={(e) => toggle(flag.id, e.target.checked)}
              />
              <span className="fhis-beta-toggle-slider" />
            </label>
          </div>
          <p className="fhis-beta-flag-desc">{flag.description}</p>
        </Panel>
      ))}
    </Stack>
  );
}
