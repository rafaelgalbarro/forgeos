"use client";

import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import type { ProductHuntTask } from "@/lib/mission-control/go-to-market/types";

interface Props {
  tasks: ProductHuntTask[];
}

const PHASE_LABEL: Record<ProductHuntTask["phase"], string> = {
  "pre-launch": "Pre-lanzamiento",
  "launch-day": "Día de lanzamiento",
  "post-launch": "Post-lanzamiento",
};

export function ProductHuntChecklistView({ tasks }: Props) {
  const byPhase = tasks.reduce<Record<string, ProductHuntTask[]>>((acc, t) => {
    (acc[t.phase] ??= []).push(t);
    return acc;
  }, {});

  return (
    <Panel>
      <Stack gap="md">
        <SectionHeader title="Checklist Product Hunt" subtitle="Pre-launch, launch day, post-launch" />
        {Object.entries(byPhase).map(([phase, items]) => (
          <section key={phase}>
            <Badge variant="amber">{PHASE_LABEL[phase as ProductHuntTask["phase"]]}</Badge>
            <ul style={{ margin: "8px 0 0", paddingLeft: 0, listStyle: "none" }}>
              {items.map((t) => (
                <li key={t.id} style={{ marginBottom: 8, fontSize: "0.8125rem" }}>
                  <input type="checkbox" readOnly checked={t.completed} style={{ marginRight: 8 }} />
                  <strong>{t.title}</strong>
                  <div style={{ color: "var(--fhis-color-text-muted)", marginLeft: 24 }}>{t.description}</div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </Stack>
    </Panel>
  );
}
