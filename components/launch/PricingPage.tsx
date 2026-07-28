"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Container, Grid, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { PRICING_TIERS } from "@/lib/launch";
import { trackPageView, trackPricingView, trackCtaClick } from "@/lib/launch/analytics-hooks";
import { LaunchNav } from "./LaunchNav";
import { FeedbackWidget } from "./FeedbackWidget";

export function PricingPage() {
  useEffect(() => {
    trackPageView("/pricing");
    trackPricingView();
  }, []);

  return (
    <div className="fhis-launch-page">
      <LaunchNav />
      <FeedbackWidget />

      <section className="fhis-launch-hero fhis-launch-hero-compact">
        <Container>
          <Stack gap="md">
            <Badge variant="default">Sin pagos reales · RC12</Badge>
            <h1 className="fhis-launch-hero-title">Planes y precios</h1>
            <p className="fhis-launch-hero-sub">
              Elige el tier que encaja con tu ambición. Todos los planes incluyen acceso beta en RC12.
            </p>
          </Stack>
        </Container>
      </section>

      <section className="fhis-launch-section">
        <Container>
          <div className="fhis-launch-pricing-grid">
            {PRICING_TIERS.map((tier) => (
              <Panel
                key={tier.id}
                className={`fhis-launch-pricing-card${tier.highlighted ? " fhis-launch-pricing-card-highlighted" : ""}`}
              >
                {tier.badge && <Badge variant="accent">{tier.badge}</Badge>}
                <h2 className="fhis-launch-pricing-name">{tier.name}</h2>
                <div className="fhis-launch-pricing-price">
                  <span className="fhis-launch-pricing-amount">{tier.price}</span>
                  <span className="fhis-launch-pricing-period">{tier.period}</span>
                </div>
                <p className="fhis-launch-pricing-desc">{tier.description}</p>
                <ul className="fhis-launch-pricing-features">
                  {tier.features.map((f) => (
                    <li key={f}>✓ {f}</li>
                  ))}
                </ul>
                <Link
                  href="/beta"
                  className={`fhis-btn ${tier.highlighted ? "fhis-btn-primary" : "fhis-btn-ghost"} fhis-launch-pricing-cta`}
                  onClick={() => trackCtaClick(`pricing_${tier.id}`, "/beta")}
                >
                  {tier.cta}
                </Link>
              </Panel>
            ))}
          </div>
        </Container>
      </section>

      <section className="fhis-launch-section fhis-launch-section-alt">
        <Container>
          <SectionHeader
            title="Preguntas frecuentes"
            description="Todo lo que necesitas saber antes de la beta"
          />
          <Grid cols={2} gap="md">
            <Panel>
              <h3>¿Hay pagos reales?</h3>
              <p>No en RC12. Los precios son informativos para el lanzamiento comercial.</p>
            </Panel>
            <Panel>
              <h3>¿Puedo cambiar de plan?</h3>
              <p>Sí, cuando lancemos facturación real podrás upgradear sin perder datos.</p>
            </Panel>
            <Panel>
              <h3>¿Qué incluye la beta?</h3>
              <p>Acceso completo a Founder, Venture Factory y Live AI en modo dry-run.</p>
            </Panel>
            <Panel>
              <h3>¿Enterprise?</h3>
              <p>
                <Link href="/support">Contacta soporte</Link> para planes personalizados.
              </p>
            </Panel>
          </Grid>
        </Container>
      </section>
    </div>
  );
}
