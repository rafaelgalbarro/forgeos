"use client";

import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import type { DailyPriority } from "@/lib/mission-control/digital-ceo/types";

interface Props {
  priorities: DailyPriority[];
  compact?: boolean;
}

const IMPACT_VARIANT: Record<DailyPriority["impact"], "default" | "accent" | "amber" | "red"> = {
  low: "default",
  medium: "amber",
  high: "red",
};

const SOURCE_LABEL: Record<DailyPriority["source"], string> = {
  "decision-center": "Decision Center",
  "mission-queue": "Cola misión",
  risk: "Riesgo",
  timeline: "Timeline",
};

export function DailyPrioritiesList({ priorities, compact }: Props) {
  return (
    <Panel className="fhis-digital-ceo-priorities">
      <Stack gap="sm">
        <SectionHeader title="Prioridades del día" subtitle={`Top ${priorities.length}`} />
        {priorities.length === 0 ? (
          <p style={{ fontSize: "0.8125rem", color: "var(--fhis-color-text-muted)", margin: 0 }}>
            Sin prioridades urgentes.
          </p>
        ) : (
          <ol style={{ margin: 0, paddingLeft: compact ? 16 : 20 }}>
            {priorities.map((p) => (
              <li key={`${p.rank}-${p.title}`} style={{ marginBottom: compact ? 6 : 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{p.title}</span>
                  <Badge variant={IMPACT_VARIANT[p.impact]}>{p.impact}</Badge>
                </div>
                {!compact && (
                  <>
                    <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--fhis-color-text-muted)" }}>
                      {p.description}
                    </p>
                    <span style={{ fontSize: "0.7rem", color: "var(--fhis-color-text-muted)" }}>
                      {SOURCE_LABEL[p.source]}
                    </span>
                  </>
                )}
              </li>
            ))}
          </ol>
        )}
      </Stack>
    </Panel>
  );
}
