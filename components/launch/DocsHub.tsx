"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Container, Grid, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { DOC_ARTICLES } from "@/lib/launch";
import { getDocsPortalSections } from "@/lib/commercial";
import { getPublicDocsStats } from "@/lib/forgeos-launch";
import { trackPageView } from "@/lib/launch/analytics-hooks";
import { LaunchNav } from "./LaunchNav";
import { FeedbackWidget } from "./FeedbackWidget";

const CATEGORY_LABELS: Record<string, string> = {
  quickstart: "Quickstart",
  guide: "Guías",
  reference: "Referencia",
  legal: "Legal",
  commercial: "Comercial",
  billing: "Facturación",
  api: "API",
  support: "Soporte",
  security: "Seguridad",
  "getting-started": "Primeros pasos",
};

interface DocsHubProps {
  activeSlug?: string;
}

export function DocsHub({ activeSlug }: DocsHubProps) {
  useEffect(() => {
    trackPageView(activeSlug ? `/docs/${activeSlug}` : "/docs");
  }, [activeSlug]);

  const activeArticle = activeSlug
    ? DOC_ARTICLES.find((a) => a.slug === activeSlug)
    : null;
  const portalSections = getDocsPortalSections();
  const portalStats = getPublicDocsStats();

  return (
    <div className="fhis-launch-page">
      <LaunchNav />
      <FeedbackWidget />

      <Container className="fhis-docs-hub">
        <SectionHeader
          title="Documentación"
          description={`Guías, quickstart y referencia — ${portalStats.articles} artículos en ${portalStats.sections} secciones`}
        />

        <div className="fhis-docs-layout">
          <aside className="fhis-docs-sidebar">
            <nav>
              {DOC_ARTICLES.map((article) => (
                <Link
                  key={article.slug}
                  href={article.slug === "quickstart" ? "/docs/quickstart" : `/docs/${article.slug}`}
                  className={`fhis-docs-nav-item${
                    activeSlug === article.slug ? " fhis-docs-nav-item-active" : ""
                  }`}
                >
                  <span>{article.title}</span>
                  <Badge variant="default">{CATEGORY_LABELS[article.category]}</Badge>
                </Link>
              ))}
            </nav>
          </aside>

          <main className="fhis-docs-main">
            {!activeArticle ? (
              <Stack gap="lg">
                <Panel className="fhis-docs-quickstart-banner">
                  <h2>Empieza aquí</h2>
                  <p>
                    Tu primera venture en 10 minutos: launch hub → beta → onboarding → ForgeOS → Venture Factory.
                  </p>
                  <div className="fhis-docs-quickstart-actions">
                    <Link href="/launch" className="fhis-btn fhis-btn-ghost fhis-btn-sm">
                      Launch Hub →
                    </Link>
                    <Link href="/docs/quickstart" className="fhis-btn fhis-btn-primary fhis-btn-sm">
                      Leer Quickstart →
                    </Link>
                  </div>
                </Panel>
                {portalSections.map((section) => (
                  <div key={section.id}>
                    <h2 style={{ marginBottom: 12 }}>{section.title}</h2>
                    <Grid cols={2} gap="md">
                      {section.articles.map((article) => (
                        <Link key={article.id} href={article.href ?? `/docs/${article.id}`}>
                          <Panel className="fhis-docs-card">
                            <Badge variant="default">
                              {CATEGORY_LABELS[article.category] ?? article.category}
                            </Badge>
                            <h3>{article.title}</h3>
                            <p>{article.summary}</p>
                          </Panel>
                        </Link>
                      ))}
                    </Grid>
                  </div>
                ))}
              </Stack>
            ) : (
              <Panel className="fhis-docs-article">
                <Badge variant="default">{CATEGORY_LABELS[activeArticle.category]}</Badge>
                <h1>{activeArticle.title}</h1>
                <p className="fhis-docs-article-summary">{activeArticle.summary}</p>
                <DocArticleContent slug={activeArticle.slug} />
                <Link href="/docs" className="fhis-docs-back">
                  ← Índice de docs
                </Link>
              </Panel>
            )}
          </main>
        </div>
      </Container>
    </div>
  );
}

function DocArticleContent({ slug }: { slug: string }) {
  switch (slug) {
    case "quickstart":
      return (
        <div className="fhis-docs-content">
          <h2>Flujo beta (5 pasos)</h2>
          <ol>
            <li>
              Visita <Link href="/landing">/landing</Link> — landing oficial de ForgeOS
            </li>
            <li>
              Solicita acceso en <Link href="/beta">/beta</Link>
            </li>
            <li>
              Completa <Link href="/onboarding">/onboarding</Link>
            </li>
            <li>
              Entra a <Link href="/os">/os</Link> — tu workspace
            </li>
            <li>
              Crea tu venture en{" "}
              <Link href="/venture-factory">/venture-factory</Link> o{" "}
              <Link href="/founder-journey">/founder-journey</Link>
            </li>
          </ol>
          <h2>Requisitos</h2>
          <p>Navegador moderno con localStorage habilitado. Sin cuenta externa en RC12.</p>
        </div>
      );
    case "onboarding":
      return (
        <div className="fhis-docs-content">
          <p>El wizard de onboarding configura perfil, objetivos y ruta de primera venture.</p>
          <p>Requiere registro beta previo en localStorage.</p>
        </div>
      );
    case "venture-factory":
      return (
        <div className="fhis-docs-content">
          <p>Pipeline: idea → naming → brand → product → landing → launch.</p>
          <Link href="/venture-factory">Abrir Venture Factory →</Link>
        </div>
      );
    case "founder-journey":
      return (
        <div className="fhis-docs-content">
          <p>Recorrido por fases: discovery, build, launch, operate.</p>
          <Link href="/founder-journey">Abrir Founder Journey →</Link>
        </div>
      );
    case "pricing":
      return (
        <div className="fhis-docs-content">
          <p>Starter (gratis), Pro (€49/mes), Business (€149/mes), Enterprise (€499/mes).</p>
          <Link href="/pricing">Ver página de precios →</Link>
        </div>
      );
    case "privacy":
      return (
        <div className="fhis-docs-content">
          <Link href="/privacy">Política de privacidad completa →</Link>
        </div>
      );
    case "security":
      return (
        <div className="fhis-docs-content">
          <Link href="/security">Página de seguridad completa →</Link>
        </div>
      );
    default:
      return <p>Artículo no encontrado.</p>;
  }
}
