"use client";

import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import type { PressKit } from "@/lib/mission-control/go-to-market/types";

interface Props {
  kit: PressKit;
}

export function PressKitView({ kit }: Props) {
  return (
    <Panel>
      <Stack gap="md">
        <SectionHeader title="Press Kit" subtitle={kit.tagline} />
        <section>
          <strong style={{ fontSize: "0.85rem" }}>Descripción de la empresa</strong>
          <p style={{ fontSize: "0.8125rem", margin: "6px 0 0", lineHeight: 1.5 }}>{kit.companyDescription}</p>
        </section>
        <section>
          <strong style={{ fontSize: "0.85rem" }}>Bio del fundador/a</strong>
          <p style={{ fontSize: "0.8125rem", margin: "6px 0 0" }}>{kit.founderBio}</p>
        </section>
        <section>
          <strong style={{ fontSize: "0.85rem" }}>Estadísticas clave</strong>
          <ul style={{ margin: "6px 0 0", paddingLeft: 0, listStyle: "none", fontSize: "0.8125rem" }}>
            {kit.keyStats.map((s) => (
              <li key={s.label} style={{ marginBottom: 4 }}>
                <Badge variant="default">{s.label}</Badge> {s.value}
              </li>
            ))}
          </ul>
        </section>
        <section>
          <strong style={{ fontSize: "0.85rem" }}>Assets</strong>
          <ul style={{ margin: "6px 0 0", paddingLeft: 16, fontSize: "0.8125rem" }}>
            {kit.assets.map((a) => (
              <li key={a.name}>
                {a.name} ({a.type}) — <Badge variant={a.status === "ready" ? "accent" : "default"}>{a.status}</Badge>
              </li>
            ))}
          </ul>
        </section>
        <p style={{ fontSize: "0.8125rem" }}>Contacto: {kit.contactEmail}</p>
      </Stack>
    </Panel>
  );
}
