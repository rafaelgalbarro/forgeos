"use client";

import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import type { MissionBrief } from "@/lib/mission-control/digital-ceo/types";

interface Props {
  brief: MissionBrief;
}

export function MissionBriefCard({ brief }: Props) {
  return (
    <Panel className="fhis-digital-ceo-mission">
      <Stack gap="sm">
        <SectionHeader title="Mission Brief" subtitle={brief.title} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Badge variant="accent">{brief.phaseLabel}</Badge>
          {brief.intention && <Badge variant="default">{brief.intention}</Badge>}
          <Badge variant="default">{brief.progressPercent}%</Badge>
        </div>
        <p style={{ fontSize: "0.8125rem", margin: 0, lineHeight: 1.5 }}>{brief.statusSummary}</p>
        {brief.activeDomains.length > 0 && (
          <p style={{ fontSize: "0.75rem", color: "var(--fhis-color-text-muted)", margin: 0 }}>
            Dominios: {brief.activeDomains.join(", ")}
          </p>
        )}
      </Stack>
    </Panel>
  );
}
