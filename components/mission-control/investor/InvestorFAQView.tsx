"use client";

import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import type { FAQItem } from "@/lib/mission-control/investor-mode/types";

interface Props {
  items: FAQItem[];
}

export function InvestorFAQView({ items }: Props) {
  return (
    <Panel>
      <Stack gap="md">
        <SectionHeader title="FAQ Inversor" subtitle="Preguntas frecuentes y respuestas" />
        {items.map((item) => (
          <details key={item.id} style={{ borderBottom: "1px solid var(--fhis-color-border)", paddingBottom: 8 }}>
            <summary style={{ cursor: "pointer", fontWeight: 500, padding: "8px 0" }}>
              {item.question}{" "}
              <Badge variant="default">{item.category}</Badge>
            </summary>
            <p style={{ fontSize: "0.875rem", color: "var(--fhis-color-text-muted)", margin: "4px 0 0", paddingLeft: 16 }}>
              {item.answer}
            </p>
          </details>
        ))}
      </Stack>
    </Panel>
  );
}
