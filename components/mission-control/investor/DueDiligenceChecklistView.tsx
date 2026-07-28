"use client";

import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { Progress } from "@/components/ui/fhis/Progress";
import type { DDChecklistItem } from "@/lib/mission-control/investor-mode/types";

interface Props {
  items: DDChecklistItem[];
}

export function DueDiligenceChecklistView({ items }: Props) {
  const completed = items.filter((i) => i.completed).length;
  const pct = Math.round((completed / Math.max(items.length, 1)) * 100);

  return (
    <Panel>
      <Stack gap="md">
        <SectionHeader title="Due Diligence" subtitle={`${completed}/${items.length} completados`} />
        <Progress value={pct} max={100} label="Progreso DD" />
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {items.map((item) => (
            <li key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--fhis-color-border)" }}>
              <div>
                <span style={{ fontWeight: 500 }}>{item.label}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--fhis-color-text-muted)", marginLeft: 8 }}>{item.category}</span>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <Badge variant={item.priority === "high" ? "amber" : "default"}>{item.priority}</Badge>
                <Badge variant={item.status === "ready" ? "accent" : item.status === "partial" ? "amber" : "default"}>
                  {item.status === "ready" ? "Listo" : item.status === "partial" ? "Parcial" : "Pendiente"}
                </Badge>
              </div>
            </li>
          ))}
        </ul>
      </Stack>
    </Panel>
  );
}
