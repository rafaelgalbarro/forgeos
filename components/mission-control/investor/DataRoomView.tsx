"use client";

import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import type { DataRoomDoc } from "@/lib/mission-control/investor-mode/types";

const CATEGORY_LABELS: Record<DataRoomDoc["category"], string> = {
  legal: "Legal",
  financial: "Financiero",
  product: "Producto",
  team: "Equipo",
};

interface Props {
  docs: DataRoomDoc[];
}

export function DataRoomView({ docs }: Props) {
  const categories = ["legal", "financial", "product", "team"] as const;

  return (
    <Panel>
      <Stack gap="md">
        <SectionHeader title="Data Room" subtitle="Índice de documentos para inversores" />
        {categories.map((cat) => {
          const items = docs.filter((d) => d.category === cat);
          if (!items.length) return null;
          return (
            <div key={cat}>
              <h4 style={{ fontSize: "0.875rem", fontWeight: 600, marginBottom: 8 }}>{CATEGORY_LABELS[cat]}</h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {items.map((doc) => (
                  <li key={doc.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--fhis-color-border)" }}>
                    <div>
                      <span style={{ fontWeight: 500 }}>{doc.title}</span>
                      <p style={{ fontSize: "0.75rem", color: "var(--fhis-color-text-muted)", margin: "2px 0 0" }}>{doc.description}</p>
                    </div>
                    <Badge variant={doc.status === "ready" ? "accent" : doc.status === "partial" ? "amber" : "default"}>
                      {doc.status === "ready" ? "Listo" : doc.status === "partial" ? "Parcial" : "Pendiente"}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </Stack>
    </Panel>
  );
}
