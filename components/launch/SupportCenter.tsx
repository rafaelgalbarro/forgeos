"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Container, Grid, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { SUPPORT_ARTICLES } from "@/lib/launch";
import { trackPageView } from "@/lib/launch/analytics-hooks";
import { LaunchNav } from "./LaunchNav";
import { FeedbackWidget } from "./FeedbackWidget";
import { BetaSignupForm } from "./BetaSignupForm";

const CATEGORY_LABELS: Record<string, string> = {
  "getting-started": "Primeros pasos",
  billing: "Facturación",
  technical: "Técnico",
  account: "Cuenta",
};

export function SupportCenter() {
  useEffect(() => {
    trackPageView("/support");
  }, []);

  return (
    <div className="fhis-launch-page">
      <LaunchNav />
      <FeedbackWidget />

      <Container className="fhis-support-page">
        <SectionHeader
          title="Centro de soporte"
          description="Ayuda, FAQ y contacto durante la beta privada"
        />

        <Grid cols={2} gap="lg">
          <Stack gap="md">
            <h2 className="fhis-support-section-title">Artículos de ayuda</h2>
            {SUPPORT_ARTICLES.map((article) => (
              <Panel key={article.id} className="fhis-support-article">
                <Badge variant="default">{CATEGORY_LABELS[article.category]}</Badge>
                <h3>{article.title}</h3>
                <p>{article.summary}</p>
              </Panel>
            ))}
          </Stack>

          <Stack gap="md">
            <Panel className="fhis-support-contact">
              <h2>¿Necesitas acceso?</h2>
              <p>Regístrate en la beta y empieza en minutos.</p>
              <BetaSignupForm compact />
            </Panel>

            <Panel className="fhis-support-links">
              <h2>Enlaces útiles</h2>
              <ul>
                <li>
                  <Link href="/docs/quickstart">Quickstart</Link>
                </li>
                <li>
                  <Link href="/onboarding">Onboarding</Link>
                </li>
                <li>
                  <Link href="/status">Estado del sistema</Link>
                </li>
                <li>
                  <Link href="/pricing">Planes y precios</Link>
                </li>
                <li>
                  <Link href="/os">Entrar a ForgeOS</Link>
                </li>
              </ul>
            </Panel>

            <Panel className="fhis-support-feedback-hint">
              <h2>Feedback</h2>
              <p>
                Usa el widget 💬 en la esquina inferior derecha para enviar bugs, ideas o comentarios
                generales.
              </p>
            </Panel>
          </Stack>
        </Grid>
      </Container>
    </div>
  );
}
