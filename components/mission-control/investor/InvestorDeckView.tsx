"use client";

import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import type { DeckSlide } from "@/lib/mission-control/investor-mode/types";

interface Props {
  slides: DeckSlide[];
}

export function InvestorDeckView({ slides }: Props) {
  return (
    <Panel>
      <Stack gap="md">
        <SectionHeader title="Investor Deck" subtitle="Outline de slides para pitch" />
        {slides.map((slide) => (
          <div key={slide.id} style={{ padding: 12, border: "1px solid var(--fhis-color-border)", borderRadius: 8 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: "0.75rem", color: "var(--fhis-color-text-muted)" }}>#{slide.order}</span>
              <strong>{slide.title}</strong>
            </div>
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: "0.875rem" }}>
              {slide.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
            {slide.notes && (
              <p style={{ fontSize: "0.75rem", color: "var(--fhis-color-text-muted)", marginTop: 6 }}>{slide.notes}</p>
            )}
          </div>
        ))}
      </Stack>
    </Panel>
  );
}
