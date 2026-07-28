import Link from "next/link";
import { VentureE2EDashboard } from "@/components/venture-e2e/VentureE2EDashboard";
import { OsModuleFrame } from "@/components/os/OsModuleFrame";
import { EmptyState } from "@/components/ui/fhis/EmptyState";
import { UnavailableState } from "@/components/ui/UnavailableState";
import { isValidVentureProject, resolveVentureFixture } from "@/lib/venture-e2e/fixture-registry";
import { loadVenturePageSnapshot } from "@/lib/ventures/venture-page-summary-loader";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const fixture = resolveVentureFixture(slug);
  const venture = fixture?.venture;
  return {
    title:
      fixture && isValidVentureProject(venture)
        ? `${venture.name} — Venture E2E`
        : "Venture E2E",
    description: "Program 10000 — Generic Venture E2E Pipeline",
  };
}

function VentureNotFound({ slug }: { slug: string }) {
  return (
    <OsModuleFrame title="Venture E2E" description="Program 10000 — Generic Venture E2E Pipeline">
      <EmptyState
        icon="◎"
        title="Venture Not Found"
        description={`No se pudo cargar el venture "${slug}". Comprueba el slug o elige un venture del registry.`}
      >
        <Link href="/dashboard">Volver al dashboard</Link>
      </EmptyState>
    </OsModuleFrame>
  );
}

export default async function VentureSlugPage({ params }: Props) {
  const { slug } = await params;
  const fixture = resolveVentureFixture(slug);
  const venture = fixture?.venture;

  if (!fixture || !isValidVentureProject(venture)) {
    return <VentureNotFound slug={slug} />;
  }

  const initialSnapshot = loadVenturePageSnapshot(slug);
  if (!initialSnapshot) {
    return (
      <OsModuleFrame title="Venture E2E" description="Program 10000 — Generic Venture E2E Pipeline">
        <UnavailableState
          toolName="Venture E2E"
          reason={`No se pudo componer el snapshot para "${slug}".`}
          ctaHref="/mission-control"
          ctaLabel="Ir a Mission Control"
        />
      </OsModuleFrame>
    );
  }

  return (
    <OsModuleFrame
      title={venture.name}
      description="Pipeline E2E genérico — Venture Factory, Intelligence, Build, CEO Engine"
    >
      <div style={{ marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <Link
          href={`/company/${slug}`}
          style={{
            fontSize: "0.85rem",
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid var(--fhis-color-border, #d4d0c8)",
            color: "inherit",
            textDecoration: "none",
          }}
        >
          Company OS
        </Link>
        <Link
          href={`/studio/${slug === "nexora-field" ? "mc-nexora-field-e2e-5350" : slug}`}
          style={{
            fontSize: "0.85rem",
            padding: "6px 12px",
            borderRadius: 6,
            background: "var(--fhis-color-accent, #2563eb)",
            color: "#fff",
            textDecoration: "none",
          }}
        >
          🎨 Abrir Output Studio
        </Link>
      </div>
      <VentureE2EDashboard ventureSlug={slug} initialSnapshot={initialSnapshot} />
    </OsModuleFrame>
  );
}
