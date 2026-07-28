"use client";

import type { Template } from "@/lib/mobile-factory";
import { MOBILE_TEMPLATES } from "@/lib/mobile-factory";
import { Grid, Panel, Stack } from "@/components/ui/fhis/Layout";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";

interface Props {
  selectedId: string | null;
  onSelect: (template: Template) => void;
}

export function MobileTemplates({ selectedId, onSelect }: Props) {
  return (
    <Stack gap="md">
      <p style={{ margin: 0, color: "var(--fhis-color-text-muted)", fontSize: 14 }}>
        Elige una plantilla base para tu app móvil. Cada plantilla incluye navegación, pantallas y
        flujos predefinidos.
      </p>
      <Grid cols={2} gap="md">
        {MOBILE_TEMPLATES.map((template) => {
          const selected = selectedId === template.id;
          return (
            <Panel
              key={template.id}
              className={selected ? "fhis-mf-template-selected" : undefined}
              style={{
                cursor: "pointer",
                border: selected
                  ? "2px solid var(--fhis-color-accent)"
                  : "1px solid var(--fhis-color-border)",
              }}
              onClick={() => onSelect(template)}
            >
              <Stack gap="sm">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: "1.5rem" }} aria-hidden>
                    {template.icon}
                  </span>
                  <div>
                    <strong>{template.name}</strong>
                    <div style={{ fontSize: 12, color: "var(--fhis-color-text-muted)" }}>
                      {template.category}
                    </div>
                  </div>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--fhis-color-text-muted)" }}>
                  {template.description}
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {template.features.slice(0, 3).map((f) => (
                    <Badge key={f} variant="default">
                      {f}
                    </Badge>
                  ))}
                </div>
                <Button
                  variant={selected ? "primary" : "secondary"}
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(template);
                  }}
                >
                  {selected ? "Seleccionada" : "Usar plantilla"}
                </Button>
              </Stack>
            </Panel>
          );
        })}
      </Grid>
    </Stack>
  );
}
