"use client";

import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Checkbox } from "@/components/ui/fhis/Checkbox";
import type { PendingDecision } from "@/lib/mission-control/types";
import type { DecisionImpact } from "@/lib/mission-control/exit-strategy";
import { DecisionImpactBadge } from "./exit/DecisionImpactList";

interface Props {
  decisions: PendingDecision[];
  onResolve: (decisionId: string, option: string) => void;
  decisionImpacts?: DecisionImpact[];
}

export function DecisionCenterPanel({ decisions, onResolve, decisionImpacts }: Props) {
  const pending = decisions.filter((d) => !d.resolved);
  if (!pending.length) return null;

  return (
    <Panel className="fhis-mc-decision-panel">
      <Stack gap="md">
        <SectionHeader title="Centro de Decisiones" subtitle="Una decisión a la vez" />
        {pending.map((dec) => {
          const impact = decisionImpacts?.find((i) => i.decisionId === dec.id);
          return (
          <div key={dec.id} style={{ borderBottom: "1px solid var(--fhis-color-border)", paddingBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <strong style={{ fontSize: "0.875rem" }}>{dec.title}</strong>
              {impact && <DecisionImpactBadge impact={impact} />}
            </div>
            <p style={{ fontSize: "0.8125rem", color: "var(--fhis-color-text-muted)", margin: "4px 0 8px" }}>
              {dec.description}
            </p>
            {impact && (
              <p style={{ fontSize: "0.75rem", color: "var(--fhis-color-text-muted)", margin: "0 0 8px" }}>
                {impact.explanation}
              </p>
            )}
            {dec.options.map((opt) => (
              <Checkbox
                key={opt}
                label={opt}
                checked={dec.selectedOption === opt}
                onChange={(checked) => checked && onResolve(dec.id, opt)}
              />
            ))}
          </div>
          );
        })}
      </Stack>
    </Panel>
  );
}
