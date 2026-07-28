"use client";

import { Badge, Button, Card, Grid } from "@/components/ui/fhis";
import type { Template } from "@/lib/website-factory";

interface WebsiteTemplatesProps {
  templates: Template[];
  selectedId?: string;
  onSelect: (templateId: string) => void;
}

const CATEGORY_LABEL: Record<Template["category"], string> = {
  landing: "Landing",
  portfolio: "Portfolio",
  saas: "SaaS",
  blog: "Blog",
  ecommerce: "E-commerce",
  docs: "Docs",
};

export function WebsiteTemplates({ templates, selectedId, onSelect }: WebsiteTemplatesProps) {
  return (
    <Grid cols={3} gap="md">
      {templates.map((t) => {
        const selected = t.id === selectedId;
        return (
          <Card
            key={t.id}
            variant={selected ? "elevated" : "default"}
            padding="md"
            className="fhis-wf-template-card"
            style={{
              border: selected ? "1px solid var(--fhis-color-accent)" : undefined,
              cursor: "pointer",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <strong>{t.name}</strong>
              <Badge variant="default">{CATEGORY_LABEL[t.category]}</Badge>
            </div>
            <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--fhis-color-text-muted)" }}>
              {t.description}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
              {t.tags.map((tag) => (
                <Badge key={tag} variant="accent">
                  {tag}
                </Badge>
              ))}
            </div>
            <p style={{ margin: "0 0 12px", fontSize: 12, color: "var(--fhis-color-text-muted)" }}>
              {t.defaultPages.length} páginas · {t.suggestedComponents.length} componentes
            </p>
            <Button variant={selected ? "primary" : "secondary"} size="sm" onClick={() => onSelect(t.id)}>
              {selected ? "Seleccionado" : "Usar plantilla"}
            </Button>
          </Card>
        );
      })}
    </Grid>
  );
}
