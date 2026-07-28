"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Container, Grid, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { trackPageView, trackCtaClick } from "@/lib/launch/analytics-hooks";
import {
  getLaunchHubData,
  PRIMARY_LAUNCH_LINKS,
  listMarketingSections,
} from "@/lib/forgeos-launch";
import { CHANGELOG } from "@/lib/launch/changelog";
import { LaunchNav } from "./LaunchNav";
import { FeedbackWidget } from "./FeedbackWidget";
import { NewsletterSignup } from "./NewsletterSignup";
import { CaseStudiesPanel } from "./CaseStudiesPanel";

export function LaunchHub() {
  const hub = getLaunchHubData();
  const sections = listMarketingSections();

  useEffect(() => {
    trackPageView("/launch");
  }, []);

  return (
    <div className="fhis-launch-page">
      <LaunchNav />
      <FeedbackWidget />

      <section className="fhis-launch-hero">
        <Container>
          <Stack gap="lg">
            <div className="fhis-launch-hero-badges">
              <Badge variant="accent">Program 7000</Badge>
              <Badge variant="default">ForgeOS {hub.version}</Badge>
              {hub.launchMode && <Badge variant="accent">Launch Mode</Badge>}
            </div>
            <h1 className="fhis-launch-hero-title">{hub.title}</h1>
            <p className="fhis-launch-hero-sub">{hub.tagline}</p>
            <div className="fhis-launch-hero-ctas">
              <Link
                href="/demo"
                className="fhis-btn fhis-btn-primary"
                onClick={() => trackCtaClick("launch_demo", "/demo")}
              >
                Probar demo
              </Link>
              <Link
                href="/pricing"
                className="fhis-btn fhis-btn-ghost"
                onClick={() => trackCtaClick("launch_pricing", "/pricing")}
              >
                Ver precios
              </Link>
              <Link href="/landing" className="fhis-btn fhis-btn-ghost fhis-btn-sm">
                Landing RC12 →
              </Link>
            </div>
          </Stack>
        </Container>
      </section>

      <section className="fhis-launch-section">
        <Container>
          <Grid cols={4} gap="md">
            {hub.stats.map((stat) => (
              <Panel key={stat.label} className="fhis-launch-stat-card">
                <span className="fhis-launch-stat-value">{stat.value}</span>
                <span className="fhis-launch-stat-label">{stat.label}</span>
              </Panel>
            ))}
          </Grid>
        </Container>
      </section>

      <section className="fhis-launch-section fhis-launch-section-alt">
        <Container>
          <SectionHeader
            title="Superficies públicas"
            description="Navegación central del lanzamiento ForgeOS 1.0"
          />
          <Grid cols={2} gap="md">
            {PRIMARY_LAUNCH_LINKS.map((link) => (
              <Link
                key={link.id}
                href={link.href}
                className="fhis-launch-hub-link"
                onClick={() => trackCtaClick(`launch_hub_${link.id}`, link.href)}
              >
                <Panel className="fhis-launch-hub-card">
                  <div className="fhis-launch-hub-card-header">
                    <h3>{link.label}</h3>
                    {link.badge && <Badge variant="accent">{link.badge}</Badge>}
                  </div>
                  <p>{link.description}</p>
                </Panel>
              </Link>
            ))}
          </Grid>
        </Container>
      </section>

      <section className="fhis-launch-section">
        <Container>
          <SectionHeader title="Por qué ForgeOS" description="Marketing y propuesta de valor" />
          <Stack gap="lg">
            {sections.map((section) => (
              <Panel key={section.id} className="fhis-launch-marketing-section">
                <h3>{section.title}</h3>
                <p>{section.description}</p>
                {section.bullets && (
                  <ul className="fhis-launch-beta-perks">
                    {section.bullets.map((b) => (
                      <li key={b}>✓ {b}</li>
                    ))}
                  </ul>
                )}
                {section.cta && (
                  <Link href={section.cta.href} className="fhis-btn fhis-btn-ghost fhis-btn-sm">
                    {section.cta.label} →
                  </Link>
                )}
              </Panel>
            ))}
          </Stack>
        </Container>
      </section>

      <section className="fhis-launch-section fhis-launch-section-alt">
        <Container>
          <CaseStudiesPanel />
        </Container>
      </section>

      <section className="fhis-launch-section">
        <Container>
          <SectionHeader title="Última versión" description={CHANGELOG[0].date} />
          <Panel className="fhis-launch-changelog-preview">
            <Badge variant="accent">{CHANGELOG[0].version}</Badge>
            <h3>{CHANGELOG[0].title}</h3>
            <ul>
              {CHANGELOG[0].highlights.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
            <Link href="/changelog" className="fhis-btn fhis-btn-ghost fhis-btn-sm">
              Ver changelog completo →
            </Link>
          </Panel>
        </Container>
      </section>

      <section className="fhis-launch-section fhis-launch-section-alt">
        <Container>
          <SectionHeader
            title="Newsletter"
            description="Recibe novedades del lanzamiento (localStorage stub)"
          />
          <NewsletterSignup />
        </Container>
      </section>

      <footer className="fhis-launch-footer">
        <Container>
          <div className="fhis-launch-footer-grid">
            <div>
              <strong>ForgeOS</strong>
              <p>AI Venture Studio · {hub.version}</p>
            </div>
            <div className="fhis-launch-footer-links">
              <Link href="/docs">Docs</Link>
              <Link href="/community">Comunidad</Link>
              <Link href="/demo">Demo</Link>
              <Link href="/privacy">Privacidad</Link>
              <Link href="/security">Seguridad</Link>
            </div>
          </div>
        </Container>
      </footer>
    </div>
  );
}
