"use client";

import { Panel, Stack, SectionHeader, Badge, Progress } from "@/components/ui/fhis";
import { buildProductionChecklist, checklistScore } from "@/lib/production-readiness";

export function ProductionChecklistPanel() {
  const items = buildProductionChecklist();
  const score = checklistScore(items);
  const pass = items.filter((i) => i.status === "pass").length;

  return (
    <Stack gap="lg" className="fhis-prod-checklist">
      <Progress value={pass} max={items.length} label={`Checklist — ${score}%`} />

      <Panel>
        <SectionHeader title="Checklist automático" subtitle="Validación pre-producción" />
        <ul className="fhis-prod-list">
          {items.map((item) => (
            <li key={item.id} className="fhis-prod-checklist-row">
              <Badge
                variant={
                  item.status === "pass"
                    ? "accent"
                    : item.status === "fail"
                      ? "red"
                      : "amber"
                }
              >
                {item.status}
              </Badge>
              <div>
                <strong>{item.label}</strong>
                <span className="fhis-prod-muted"> — {item.category}</span>
                {item.detail && <p className="fhis-prod-text">{item.detail}</p>}
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </Stack>
  );
}
