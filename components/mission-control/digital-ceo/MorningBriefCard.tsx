"use client";

import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import type { MorningBrief } from "@/lib/mission-control/digital-ceo/types";

interface Props {
  brief: MorningBrief;
}

export function MorningBriefCard({ brief }: Props) {
  return (
    <Panel className="fhis-digital-ceo-morning">
      <Stack gap="sm">
        <SectionHeader title="Morning Brief" subtitle={brief.greeting} />
        <p style={{ fontSize: "0.875rem", fontWeight: 500, margin: 0 }}>{brief.headline}</p>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: "0.8125rem", color: "var(--fhis-color-text-muted)" }}>
          {brief.keyItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
        <div style={{ fontSize: "0.75rem", color: "var(--fhis-color-text-muted)" }}>
          {brief.pendingDecisionCount} decisiones · {brief.riskCount} riesgos
        </div>
      </Stack>
    </Panel>
  );
}
