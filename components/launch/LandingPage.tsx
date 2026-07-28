"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Container, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { trackPageView, trackCtaClick } from "@/lib/launch/analytics-hooks";
import { CHANGELOG } from "@/lib/launch/changelog";
import { PUBLIC_ROADMAP } from "@/lib/launch/public-roadmap";
import { LaunchNav } from "./LaunchNav";
import { UseCaseCards } from "./UseCaseCards";
import { DemoVideoPlaceholder } from "./DemoVideoPlaceholder";
import { BetaSignupForm } from "./BetaSignupForm";
import { FeedbackWidget } from "./FeedbackWidget";

export function LandingPage() {
  useEffect(() => {
    trackPageView("/landing");
  }, []);

  return (
    <div className="fhis-launch-page">
      <LaunchNav />
      <FeedbackWidget />

      <section className="fhis-launch-hero">
        <Container>
          <Stack gap="lg">
            <div className="fhis-launch-hero-badges">
              <Badge variant="accent">RC12 · Beta privada</Badge>
              <Badge variant="default">ForgeOS 1.0</Badge>
            </div>
            <h1 className="fhis-launch-hero-title">
              El sistema operativo para crear ventures con IA
            </h1>
            <p className="fhis-launch-hero-sub">
              De idea a empresa digital completa. Validación, brand, producto, go-to-market y
              operaciones — todo en un solo workspace.
            </p>
            <div className="fhis-launch-hero-ctas">
              <Link
                href="/beta"
                className="fhis-btn fhis-btn-primary"
                onClick={() => trackCtaClick("hero_beta", "/beta")}
              >
                Solicitar beta
              </Link>
              <Link
                href="/pricing"
                className="fhis-btn fhis-btn-ghost"
                onClick={() => trackCtaClick("hero_pricing", "/pricing")}
              >
                Ver precios
              </Link>
              <Link href="/docs/quickstart" className="fhis-btn fhis-btn-ghost fhis-btn-sm">
                Quickstart →
              </Link>
            </div>
          </Stack>
        </Container>
      </section>

      <section className="fhis-launch-section">
        <Container>
          <SectionHeader
            title="Mira ForgeOS en acción"
            description="Demo placeholder — RC12 launch preparation"
          />
          <DemoVideoPlaceholder />
        </Container>
      </section>

      <section className="fhis-launch-section">
        <Container>
          <SectionHeader
            title="Para quién es ForgeOS"
            description="Fundadores, estudios y equipos de innovación"
          />
          <UseCaseCards />
        </Container>
      </section>

      <section className="fhis-launch-section fhis-launch-section-alt">
        <Container>
          <div className="fhis-launch-beta-grid">
            <div>
              <SectionHeader
                title="Únete a la beta privada"
                description="Acceso instantáneo. Sin tarjeta. Sin emails reales en RC12."
              />
              <ul className="fhis-launch-beta-perks">
                <li>✓ Venture Factory completo (dry-run)</li>
                <li>✓ Founder Journey guiado</li>
                <li>✓ Live AI Operations Center</li>
                <li>✓ Feedback directo al equipo</li>
              </ul>
            </div>
            <BetaSignupForm />
          </div>
        </Container>
      </section>

      <section className="fhis-launch-section">
        <Container>
          <SectionHeader title="Roadmap público" description="Lo que viene en ForgeOS" />
          <ul className="fhis-launch-roadmap-preview">
            {PUBLIC_ROADMAP.slice(0, 4).map((item) => (
              <li key={item.id} className="fhis-launch-roadmap-item">
                <Badge variant={item.status === "shipped" ? "accent" : "default"}>
                  {item.status}
                </Badge>
                <span className="fhis-launch-roadmap-title">{item.title}</span>
                <span className="fhis-launch-roadmap-quarter">{item.quarter}</span>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <section className="fhis-launch-section fhis-launch-section-alt">
        <Container>
          <SectionHeader title="Últimas novedades" />
          <div className="fhis-launch-changelog-preview">
            <Badge variant="accent">{CHANGELOG[0].version}</Badge>
            <h3>{CHANGELOG[0].title}</h3>
            <ul>
              {CHANGELOG[0].highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </div>
        </Container>
      </section>

      <footer className="fhis-launch-footer">
        <Container>
          <div className="fhis-launch-footer-grid">
            <div>
              <strong>ForgeOS</strong>
              <p>AI Venture Studio · RC12</p>
            </div>
            <div className="fhis-launch-footer-links">
              <Link href="/launch">Launch Hub</Link>
              <Link href="/docs">Docs</Link>
              <Link href="/pricing">Precios</Link>
              <Link href="/status">Status</Link>
              <Link href="/support">Soporte</Link>
              <Link href="/privacy">Privacidad</Link>
              <Link href="/security">Seguridad</Link>
            </div>
          </div>
        </Container>
      </footer>
    </div>
  );
}
