"use client";

import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import type { CEOBrief } from "@/lib/mission-control/digital-ceo/types";

interface Props {
  brief: CEOBrief;
  compact?: boolean;
}

export function CEOBriefCard({ brief, compact }: Props) {
  return (
    <Panel className="fhis-digital-ceo-ceo">
      <Stack gap="sm">
        <SectionHeader title="CEO Brief" subtitle={`${brief.confidence}% — ${brief.confidenceLabel}`} />
        <p
          style={{
            fontSize: compact ? "0.8125rem" : "0.875rem",
            margin: 0,
            lineHeight: 1.5,
            color: "var(--fhis-color-text-muted)",
          }}
        >
          {brief.strategicPerspective}
        </p>
        {!compact && brief.topPriority && (
          <div>
            <strong style={{ fontSize: "0.8125rem" }}>Prioridad estratégica</strong>
            <p style={{ margin: "4px 0 0", fontSize: "0.8125rem" }}>{brief.topPriority}</p>
          </div>
        )}
        {brief.topRisk && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Badge variant="amber">Riesgo</Badge>
            <span style={{ fontSize: "0.8125rem" }}>{brief.topRisk}</span>
          </div>
        )}
        {brief.pendingDecisionsReminder && (
          <p style={{ fontSize: "0.8125rem", margin: 0, color: "var(--fhis-color-warning, #c27803)" }}>
            {brief.pendingDecisionsReminder}
          </p>
        )}
      </Stack>
    </Panel>
  );
}
