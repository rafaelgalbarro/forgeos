"use client";

import type { PRD } from "@/lib/application-factory";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";

interface Props {
  prd: PRD | null;
}

export function PRDViewer({ prd }: Props) {
  if (!prd) return null;

  return (
    <Panel>
      <Stack gap="md">
        <SectionHeader title="PRD" subtitle={prd.title} />
        <p style={{ margin: 0, fontSize: 14 }}>{prd.description}</p>
        <div>
          <strong style={{ fontSize: 13 }}>Audiencia</strong>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--fhis-color-text-muted)" }}>
            {prd.audience}
          </p>
        </div>
        <ListSection title="Objetivos" items={prd.goals} />
        <div>
          <strong style={{ fontSize: 13 }}>Features</strong>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {prd.features.map((f) => (
              <Badge key={f} variant="default">
                {f}
              </Badge>
            ))}
          </div>
        </div>
        <ListSection title="User Stories" items={prd.userStories} />
        <ListSection title="Métricas de éxito" items={prd.successMetrics} />
      </Stack>
    </Panel>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <strong style={{ fontSize: 13 }}>{title}</strong>
      <ul style={{ margin: "8px 0 0", paddingLeft: 18, fontSize: 13, lineHeight: 1.7 }}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
