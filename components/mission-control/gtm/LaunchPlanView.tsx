"use client";

import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import type { LaunchPlan } from "@/lib/mission-control/go-to-market/types";

interface Props {
  plan: LaunchPlan;
}

export function LaunchPlanView({ plan }: Props) {
  return (
    <Panel>
      <Stack gap="md">
        <SectionHeader title="Plan de Lanzamiento" subtitle={plan.summary} />
        <p style={{ fontSize: "0.8125rem", color: "var(--fhis-color-text-muted)" }}>
          Fecha objetivo: <strong>{plan.targetLaunchDate}</strong>
        </p>
        {plan.phases.map((phase) => (
          <section key={phase.id} style={{ borderLeft: "3px solid var(--fhis-color-accent)", paddingLeft: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontSize: "0.875rem" }}>{phase.name}</strong>
              <Badge variant="default">Semanas {phase.startWeek}–{phase.endWeek}</Badge>
            </div>
            <p style={{ fontSize: "0.8125rem", color: "var(--fhis-color-text-muted)", margin: "4px 0 8px" }}>
              {phase.description}
            </p>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: "0.8125rem" }}>
              {phase.milestones.map((m) => (
                <li key={m.id} style={{ marginBottom: 4 }}>
                  S{m.dueWeek}: {m.title}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </Stack>
    </Panel>
  );
}
