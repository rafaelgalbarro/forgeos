"use client";

import type { Architecture } from "@/lib/application-factory";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";

interface Props {
  architecture: Architecture | null;
}

export function ArchitectureViewer({ architecture }: Props) {
  if (!architecture) return null;

  return (
    <Panel>
      <Stack gap="md">
        <SectionHeader title="Arquitectura" subtitle={architecture.pattern} />
        <p style={{ margin: 0, fontSize: 13, color: "var(--fhis-color-text-muted)" }}>
          Deploy: {architecture.deployment}
        </p>
        <div>
          <strong style={{ fontSize: 13 }}>Capas</strong>
          <Stack gap="sm" style={{ marginTop: 8 }}>
            {architecture.layers.map((layer) => (
              <div
                key={layer.name}
                style={{
                  padding: "10px 12px",
                  background: "var(--fhis-color-surface)",
                  borderRadius: 6,
                  border: "1px solid var(--fhis-color-border)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: 13 }}>{layer.name}</strong>
                  <Badge variant="accent">{layer.technology}</Badge>
                </div>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--fhis-color-text-muted)" }}>
                  {layer.responsibility}
                </p>
              </div>
            ))}
          </Stack>
        </div>
        <ListSection title="Flujo de datos" items={architecture.dataFlow} />
        <div>
          <strong style={{ fontSize: 13 }}>Integraciones</strong>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {architecture.integrations.map((i) => (
              <Badge key={i} variant="default">
                {i}
              </Badge>
            ))}
          </div>
        </div>
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
