"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Container, Grid, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { listLaunchKnowledgeBase } from "@/lib/forgeos-launch";
import { trackBetaPageView } from "@/lib/beta-platform";
import { LaunchNav } from "@/components/launch/LaunchNav";
import { FeedbackWidget } from "@/components/launch/FeedbackWidget";
import { WaitlistForm } from "./WaitlistForm";
import { InvitationRedeem } from "./InvitationRedeem";

const CATEGORY_LABELS: Record<string, string> = {
  "getting-started": "Primeros pasos",
  billing: "Facturación",
  technical: "Técnico",
  account: "Cuenta",
  api: "API",
  support: "Soporte",
  security: "Seguridad",
  commercial: "Comercial",
};

const BASE_SUPPORT_ARTICLES = [
  {
    id: "beta-waitlist",
    title: "¿Cómo funciona la waitlist?",
    summary: "Únete en /waitlist, recibe invitación y canjea tu código en /beta.",
    category: "getting-started" as const,
  },
  {
    id: "beta-invite-codes",
    title: "Códigos de invitación demo",
    summary: "Usa FORGE-BETA-2026 o FORGE-FOUNDER-VIP en el dashboard beta.",
    category: "getting-started" as const,
  },
  {
    id: "commercial-plans",
    title: "Planes comerciales (Program 6000)",
    summary: "Starter, Pro, Business y Enterprise — ver /pricing y /billing.",
    category: "billing" as const,
  },
  {
    id: "launch-hub-help",
    title: "Launch Hub ForgeOS 1.0",
    summary: "Navegación por /launch, demo, comunidad y changelog.",
    category: "getting-started" as const,
  },
];

const BETA_SUPPORT_ARTICLES = [
  ...BASE_SUPPORT_ARTICLES,
  ...listLaunchKnowledgeBase()
    .filter((a) => !BASE_SUPPORT_ARTICLES.some((b) => b.id === a.id))
    .slice(0, 3)
    .map((a) => ({
      id: a.id,
      title: a.title,
      summary: a.summary,
      category: (a.category === "launch" ? "getting-started" : a.category) as
        | "getting-started"
        | "billing"
        | "technical"
        | "account",
    })),
];

export function SupportHub() {
  useEffect(() => {
    trackBetaPageView("/support");
  }, []);

  return (
    <div className="fhis-launch-page">
      <LaunchNav />
      <FeedbackWidget />

      <Container className="fhis-support-page">
        <SectionHeader
          title="Centro de soporte"
          description="Ayuda, waitlist, invitaciones y contacto — beta y lanzamiento 1.0"
        />

        <div className="fhis-support-badges">
          <Badge variant="accent" className="fhis-beta-sprint-badge">
            Program 7000 · ForgeOS 1.0 Launch
          </Badge>
          <Badge variant="default" className="fhis-beta-sprint-badge">
            Program 6000 · Commercial Readiness
          </Badge>
        </div>

        <Grid cols={2} gap="lg">
          <Stack gap="md">
            <h2 className="fhis-support-section-title">Artículos de ayuda</h2>
            {BETA_SUPPORT_ARTICLES.map((article) => (
              <Panel key={article.id} className="fhis-support-article">
                <Badge variant="default">{CATEGORY_LABELS[article.category]}</Badge>
                <h3>{article.title}</h3>
                <p>{article.summary}</p>
              </Panel>
            ))}
          </Stack>

          <Stack gap="md">
            <Panel className="fhis-support-contact">
              <h2>Waitlist</h2>
              <p>Únete a la cola de acceso anticipado.</p>
              <WaitlistForm compact redirectTo="" />
            </Panel>

            <Panel className="fhis-support-contact">
              <h2>¿Tienes invitación?</h2>
              <p>Canjea tu código para crear cuenta.</p>
              <InvitationRedeem />
            </Panel>

            <Panel className="fhis-support-links">
              <h2>Enlaces útiles</h2>
              <ul>
                <li><Link href="/launch">Launch Hub</Link></li>
                <li><Link href="/demo">Demo interactiva</Link></li>
                <li><Link href="/community">Comunidad</Link></li>
                <li><Link href="/changelog">Changelog</Link></li>
                <li><Link href="/pricing">Precios</Link></li>
                <li><Link href="/billing">Facturación</Link></li>
                <li><Link href="/subscriptions">Suscripciones</Link></li>
                <li><Link href="/api-keys">API Keys</Link></li>
                <li><Link href="/docs">Documentación</Link></li>
                <li><Link href="/beta">Beta Dashboard</Link></li>
                <li><Link href="/waitlist">Waitlist</Link></li>
                <li><Link href="/feedback">Feedback</Link></li>
                <li><Link href="/status">Estado del sistema</Link></li>
                <li><Link href="/register">Registro</Link></li>
                <li><Link href="/os">Entrar a ForgeOS</Link></li>
              </ul>
            </Panel>
          </Stack>
        </Grid>
      </Container>
    </div>
  );
}
