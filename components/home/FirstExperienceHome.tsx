"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useAuthOptional } from "@/components/auth/AuthProvider";
import { Container, Stack, Grid } from "@/components/ui/fhis/Layout";
import { Button } from "@/components/ui/fhis/Button";
import { Badge } from "@/components/ui/fhis/Badge";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { CreationCard } from "./CreationCard";
import { CREATION_ROUTES } from "@/lib/home/routes";
import type { HomeSummary } from "@/lib/home/home-summary-types";

const HomeInsightPanels = dynamic(
  () => import("./HomeInsightPanels").then((m) => m.HomeInsightPanels),
  { ssr: false }
);

const EMPRESA_FEATURES = [
  "Research",
  "Business Model",
  "Branding",
  "Software",
  "Marketing",
  "Capital",
];

interface FirstExperienceHomeProps {
  homeSummary?: HomeSummary;
}

export function FirstExperienceHome({ homeSummary }: FirstExperienceHomeProps) {
  const auth = useAuthOptional();
  const loading = auth?.loading ?? true;
  const hasSession = !!auth?.session;
  const hasWorkspace = !!auth?.workspace;

  const commandCenterHref =
    hasSession && hasWorkspace ? "/command-center" : hasSession ? "/onboarding" : "/register";

  if (loading) {
    return (
      <div className="fhis-page immersive-root" style={{ padding: "var(--fhis-space-8)", textAlign: "center" }}>
        Cargando ForgeOS…
      </div>
    );
  }

  return (
    <div
      className="immersive-root fhis-page"
      style={{ minHeight: "100vh", background: "var(--fhis-color-bg)", paddingBottom: "var(--fhis-space-12)" }}
    >
      <Container style={{ paddingTop: "var(--fhis-space-10)", maxWidth: 1080 }}>
        <Stack gap="lg">
          <header style={{ textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
            <Badge variant="accent">ForgeOS</Badge>
            <h1 style={{ fontSize: "2rem", margin: "12px 0 8px", fontWeight: 600 }}>Bienvenido a ForgeOS</h1>
            <p style={{ color: "var(--fhis-color-text-muted)", margin: "0 0 8px", fontSize: "1.05rem" }}>
              El Sistema Operativo para crear empresas impulsadas por IA.
            </p>
            <p style={{ margin: "0 0 12px", fontSize: "1.15rem", fontWeight: 500 }}>¿Qué quieres crear hoy?</p>
            <Link href="/mission-control">
              <Button variant="primary" size="lg">
                🎯 Nueva experiencia: Mission Control
              </Button>
            </Link>
          </header>

          <Grid cols={2} gap="md">
            <CreationCard
              icon="🏢"
              title="Crear una Empresa"
              description="De la idea al negocio completo con IA ejecutiva."
              features={EMPRESA_FEATURES}
              ctaLabel="Crear Empresa"
              href={CREATION_ROUTES.empresa.href}
              available={CREATION_ROUTES.empresa.available}
            />
            <CreationCard
              icon="🌐"
              title="Crear un Sitio Web"
              description="Sitio web profesional listo para lanzar."
              features={["Idea", "Brand", "Copy", "Next.js", "Preview", "Deploy"]}
              ctaLabel="Crear Web"
              href={CREATION_ROUTES.web.href}
              available={CREATION_ROUTES.web.available}
            />
            <CreationCard
              icon="💻"
              title="Crear una Aplicación Web"
              description="Frontend, backend y base de datos integrados."
              features={["PRD", "Arquitectura", "API", "Frontend", "Auth", "Preview"]}
              ctaLabel="Crear App"
              href={CREATION_ROUTES.app.href}
              available={CREATION_ROUTES.app.available}
            />
            <CreationCard
              icon="📱"
              title="Crear una App Móvil"
              description="React Native + Expo para iOS y Android."
              ctaLabel="Crear Móvil"
              href={CREATION_ROUTES.mobile.href}
              available={CREATION_ROUTES.mobile.available}
              comingSoonNote="Mobile Factory llegará en una próxima versión del build pipeline."
            />
          </Grid>

          <div style={{ textAlign: "center", paddingTop: 8 }}>
            <Link href={commandCenterHref}>
              <Button variant="primary" size="lg">
                Entrar al Command Center
              </Button>
            </Link>
          </div>

          <section>
            <SectionHeader
              title="Tu panorama hoy"
              subtitle="Snapshot ligero — sin cargar el Executive Mesh completo."
            />
            <HomeInsightPanels summary={homeSummary} />
          </section>

          {!hasSession && (
            <div style={{ textAlign: "center", display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/login">
                <Button variant="secondary">Iniciar sesión</Button>
              </Link>
              <Link href="/landing">
                <Button variant="ghost">Descubrir ForgeOS</Button>
              </Link>
            </div>
          )}
        </Stack>
      </Container>
    </div>
  );
}
