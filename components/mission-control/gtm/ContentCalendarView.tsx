"use client";

import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import type { ContentCalendarEntry } from "@/lib/mission-control/go-to-market/types";

interface Props {
  entries: ContentCalendarEntry[];
}

const CHANNEL_LABEL: Record<ContentCalendarEntry["channel"], string> = {
  blog: "Blog",
  social: "Social",
  email: "Email",
};

export function ContentCalendarView({ entries }: Props) {
  const byWeek = entries.reduce<Record<number, ContentCalendarEntry[]>>((acc, e) => {
    (acc[e.week] ??= []).push(e);
    return acc;
  }, {});

  return (
    <Panel>
      <Stack gap="md">
        <SectionHeader title="Calendario de Contenido" subtitle="4 semanas — blog, social, email" />
        {Object.entries(byWeek).map(([week, items]) => (
          <section key={week}>
            <strong style={{ fontSize: "0.875rem" }}>Semana {week}</strong>
            <ul style={{ margin: "8px 0 0", paddingLeft: 0, listStyle: "none" }}>
              {items.map((e) => (
                <li key={e.id} style={{ marginBottom: 10, padding: 8, background: "var(--fhis-color-bg-subtle, #f8f9fa)", borderRadius: 6 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    <Badge variant="accent">{CHANNEL_LABEL[e.channel]}</Badge>
                    <span style={{ fontSize: "0.75rem", color: "var(--fhis-color-text-muted)" }}>{e.day}</span>
                  </div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 500 }}>{e.title}</div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--fhis-color-text-muted)" }}>{e.topic}</div>
                  <div style={{ fontSize: "0.75rem", marginTop: 4 }}>CTA: {e.cta}</div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </Stack>
    </Panel>
  );
}
