"use client";

import { Badge } from "@/components/ui/fhis/Badge";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import type { BetaChangelogEntry } from "@/lib/beta-platform";

interface ChangelogPanelProps {
  entries: BetaChangelogEntry[];
}

const TAG_VARIANT: Record<BetaChangelogEntry["tag"], "accent" | "default" | "amber"> = {
  major: "accent",
  minor: "default",
  patch: "amber",
};

export function ChangelogPanel({ entries }: ChangelogPanelProps) {
  return (
    <Stack gap="md">
      {entries.map((entry) => (
        <Panel key={entry.version} className="fhis-beta-changelog-entry">
          <div className="fhis-beta-changelog-head">
            <strong>{entry.title}</strong>
            <div className="fhis-beta-changelog-badges">
              <Badge variant={TAG_VARIANT[entry.tag]}>{entry.version}</Badge>
              {entry.sprint && <Badge variant="default">{entry.sprint}</Badge>}
            </div>
          </div>
          <time className="fhis-beta-changelog-date">{entry.date}</time>
          <ul className="fhis-beta-changelog-highlights">
            {entry.highlights.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </Panel>
      ))}
    </Stack>
  );
}
