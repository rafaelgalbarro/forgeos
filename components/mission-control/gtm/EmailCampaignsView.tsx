"use client";

import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import type { EmailCampaign } from "@/lib/mission-control/go-to-market/types";

interface Props {
  campaigns: EmailCampaign[];
}

const TYPE_LABEL: Record<EmailCampaign["type"], string> = {
  welcome: "Bienvenida",
  launch: "Lanzamiento",
  nurture: "Nutrición",
};

export function EmailCampaignsView({ campaigns }: Props) {
  return (
    <Panel>
      <Stack gap="md">
        <SectionHeader title="Campañas Email" subtitle="Secuencias drip — welcome, launch, nurture" />
        {campaigns.map((c) => (
          <section key={c.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <strong style={{ fontSize: "0.875rem" }}>{c.name}</strong>
              <Badge variant="accent">{TYPE_LABEL[c.type]}</Badge>
            </div>
            <ol style={{ margin: 0, paddingLeft: 20, fontSize: "0.8125rem" }}>
              {c.steps.map((s) => (
                <li key={s.id} style={{ marginBottom: 8 }}>
                  <div><strong>D{s.dayOffset >= 0 ? "+" : ""}{s.dayOffset}:</strong> {s.subject}</div>
                  <div style={{ color: "var(--fhis-color-text-muted)" }}>{s.preview}</div>
                  <div style={{ fontSize: "0.75rem" }}>Objetivo: {s.goal}</div>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </Stack>
    </Panel>
  );
}
