"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Container, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { trackPageView } from "@/lib/launch/analytics-hooks";
import { getBetaSignup } from "@/lib/launch/beta-signup";
import type { BetaSignupRecord } from "@/lib/launch/types";
import { LaunchNav } from "./LaunchNav";
import { BetaSignupForm } from "./BetaSignupForm";
import { FeedbackWidget } from "./FeedbackWidget";

export function BetaPage() {
  const [existing, setExisting] = useState<BetaSignupRecord | null>(null);

  useEffect(() => {
    trackPageView("/beta");
    setExisting(getBetaSignup());
  }, []);

  return (
    <div className="fhis-launch-page">
      <LaunchNav />
      <FeedbackWidget />

      <Container className="fhis-beta-page">
        <SectionHeader
          title="Beta privada ForgeOS 1.0"
          description="Acceso anticipado al sistema operativo de ventures con IA"
        />

        <div className="fhis-beta-layout">
          <Stack gap="lg">
            <Badge variant="accent">RC12 · Sin pagos ni emails reales</Badge>
            <ul className="fhis-beta-perks">
              <li>✓ Acceso instantáneo tras registro</li>
              <li>✓ Venture Factory + Founder Journey</li>
              <li>✓ Live AI Operations (dry-run)</li>
              <li>✓ Influencia directa en el roadmap</li>
            </ul>
            {existing && (
              <p className="fhis-beta-existing">
                Ya registrado como <strong>{existing.name}</strong>.{" "}
                <Link href="/onboarding">Continuar onboarding →</Link>
              </p>
            )}
            <p>
              ¿Ya tienes acceso?{" "}
              <Link href="/os" className="fhis-btn fhis-btn-ghost fhis-btn-sm">
                Entrar a ForgeOS
              </Link>
            </p>
          </Stack>
          <BetaSignupForm />
        </div>
      </Container>
    </div>
  );
}
