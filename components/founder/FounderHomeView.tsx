"use client";

import Link from "next/link";
import { Container, Grid, Stack } from "@/components/ui/fhis/Layout";
import { PageTemplate } from "@/components/ui/fhis/PageTemplate";
import { Card } from "@/components/ui/fhis/Card";
import { cn } from "@/lib/design-system/cn";

export function FounderHomeView() {
  return (
    <Container style={{ paddingTop: "var(--fhis-space-6)", paddingBottom: "var(--fhis-space-8)" }}>
      <PageTemplate
        title="Experiencia del fundador"
        subtitle="ForgeOS te acompaña sin exponer runtime ni workers."
      >
        <Grid cols={2} gap="lg">
          <Card variant="elevated" padding="lg">
            <Stack gap="md">
              <h2 style={{ margin: 0, fontSize: "var(--fhis-text-lg)" }}>Founder Journey</h2>
              <p style={{ margin: 0, color: "var(--fhis-color-text-muted)" }}>
                Recorrido guiado en 15 fases: de la idea al lanzamiento.
              </p>
              <Link href="/founder-journey" className={cn("fhis-btn", "fhis-btn-primary", "fhis-btn-sm")}>
                Ver mi recorrido
              </Link>
            </Stack>
          </Card>
          <Card variant="elevated" padding="lg">
            <Stack gap="md">
              <h2 style={{ margin: 0, fontSize: "var(--fhis-text-lg)" }}>Mis empresas</h2>
              <p style={{ margin: 0, color: "var(--fhis-color-text-muted)" }}>
                Portfolio y próximas acciones recomendadas.
              </p>
              <Link href="/projects" className={cn("fhis-btn", "fhis-btn-secondary", "fhis-btn-sm")}>
                Abrir portfolio
              </Link>
            </Stack>
          </Card>
        </Grid>
      </PageTemplate>
    </Container>
  );
}
