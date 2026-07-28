"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Container, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { trackBetaPageView } from "@/lib/beta-platform";
import { LaunchNav } from "@/components/launch/LaunchNav";
import { FeedbackWidget } from "@/components/launch/FeedbackWidget";
import { WaitlistForm } from "./WaitlistForm";

export function WaitlistPage() {
  useEffect(() => {
    trackBetaPageView("/waitlist");
  }, []);

  return (
    <div className="fhis-launch-page">
      <LaunchNav />
      <FeedbackWidget />

      <Container className="fhis-beta-page">
        <SectionHeader
          title="Waitlist beta privada"
          description="Únete a la cola de acceso anticipado a ForgeOS"
        />

        <div className="fhis-beta-layout">
          <Stack gap="lg">
            <Badge variant="accent">Sprint 6 · Private Beta</Badge>
            <ul className="fhis-beta-perks">
              <li>✓ Posición en cola visible al instante</li>
              <li>✓ Códigos de invitación demo disponibles</li>
              <li>✓ Acceso a Venture Factory + Founder Journey</li>
              <li>✓ Influencia directa en el roadmap</li>
            </ul>
            <p>
              ¿Ya tienes invitación?{" "}
              <Link href="/beta" className="fhis-btn fhis-btn-ghost fhis-btn-sm">
                Ir al Beta Dashboard →
              </Link>
            </p>
          </Stack>
          <WaitlistForm redirectTo="/beta" />
        </div>
      </Container>
    </div>
  );
}
