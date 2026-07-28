"use client";

import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import type { OnboardingTask } from "@/lib/mission-control/go-to-market/types";

interface Props {
  tasks: OnboardingTask[];
}

export function OnboardingChecklistView({ tasks }: Props) {
  const completed = tasks.filter((t) => t.completed).length;

  return (
    <Panel>
      <Stack gap="md">
        <SectionHeader
          title="Checklist Onboarding"
          subtitle={`${completed}/${tasks.length} tareas completadas`}
        />
        <ol style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
          {tasks.map((t) => (
            <li key={t.id} style={{ marginBottom: 10, padding: 8, borderBottom: "1px solid var(--fhis-color-border, #eee)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Badge variant="default">Paso {t.step}</Badge>
                <strong style={{ fontSize: "0.875rem" }}>{t.title}</strong>
                <Badge variant="amber">{t.owner}</Badge>
              </div>
              <p style={{ fontSize: "0.8125rem", margin: "4px 0 0", color: "var(--fhis-color-text-muted)" }}>
                {t.description}
              </p>
            </li>
          ))}
        </ol>
      </Stack>
    </Panel>
  );
}
