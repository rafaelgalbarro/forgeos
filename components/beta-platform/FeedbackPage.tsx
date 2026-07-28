"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { trackBetaPageView } from "@/lib/beta-platform";
import { LaunchNav } from "@/components/launch/LaunchNav";
import { FeedbackWidget } from "@/components/launch/FeedbackWidget";
import { FeedbackForm } from "./FeedbackForm";

export function FeedbackPage() {
  useEffect(() => {
    trackBetaPageView("/feedback");
  }, []);

  return (
    <div className="fhis-launch-page">
      <LaunchNav />
      <FeedbackWidget />

      <Container className="fhis-beta-feedback-page">
        <SectionHeader
          title="Feedback beta"
          description="Tu opinión moldea ForgeOS — bugs, ideas y mejoras de UX"
        />

        <div className="fhis-beta-feedback-layout">
          <Stack gap="md">
            <Panel>
              <h2 className="fhis-beta-panel-title">Enviar feedback</h2>
              <FeedbackForm />
            </Panel>
          </Stack>
          <Stack gap="md">
            <Panel>
              <h2 className="fhis-beta-panel-title">¿Qué buscamos?</h2>
              <ul className="fhis-beta-perks">
                <li>🐛 Bugs y errores inesperados</li>
                <li>💡 Ideas de features para founders</li>
                <li>🎨 Mejoras de UX y flujos confusos</li>
                <li>⚡ Problemas de rendimiento</li>
              </ul>
            </Panel>
            <p className="fhis-beta-signup-hint">
              También puedes usar el widget 💬 en cualquier página beta.{" "}
              <Link href="/beta">Volver al dashboard →</Link>
            </p>
          </Stack>
        </div>
      </Container>
    </div>
  );
}
