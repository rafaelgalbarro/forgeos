"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ProvenanceBadge } from "./ProvenanceBadge";

const SECTION_LABELS: Record<string, string> = {
  company: "Company",
  brand: "Brand",
  website: "Website",
  "web-app": "Web App",
  mobile: "Mobile",
  backend: "Backend",
  data: "Data",
  code: "Code",
  build: "Build",
  preview: "Preview",
  release: "Release",
  deployment: "Deployment",
};

const LazyVisual = dynamic(
  () =>
    Promise.resolve({
      default: function StudioSectionVisual({ section }: { section: string }) {
        return (
          <div
            style={{
              padding: 28,
              borderRadius: 12,
              border: "1px dashed var(--fhis-color-border, #d4d0c8)",
              background: "var(--fhis-color-surface-muted, #f5f3ee)",
              minHeight: 200,
            }}
          >
            <p style={{ margin: 0, fontSize: 13, opacity: 0.75 }}>
              Visualización on-demand · sección <strong>{SECTION_LABELS[section] ?? section}</strong>
            </p>
            <p style={{ marginTop: 10, fontSize: 14 }}>
              Sin AI Runtime / Factory engines / Build Runtime / Deployment providers en el bundle inicial.
              Previews pesados se cargan solo al entrar en la sección.
            </p>
          </div>
        );
      },
    }),
  {
    ssr: false,
    loading: () => (
      <div className="fhis-empty-state" style={{ padding: 32 }} role="status">
        <div className="fhis-empty-state-title">Cargando visualización…</div>
      </div>
    ),
  }
);

export function StudioSectionView({
  missionId,
  section,
}: {
  missionId: string;
  section: string;
}) {
  const label = SECTION_LABELS[section] ?? section;
  const mobileLimited = section === "code";

  return (
    <div style={{ maxWidth: 960 }}>
      <header style={{ marginBottom: 16 }}>
        <p style={{ margin: 0, fontSize: 12, opacity: 0.65 }}>
          <Link href={`/studio/${missionId}`}>Studio</Link> / {label}
        </p>
        <h1 style={{ margin: "6px 0 0", fontSize: "1.4rem" }}>{label}</h1>
        <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <ProvenanceBadge badge={{ label: "DEMO", tone: "demo" }} />
          {mobileLimited && (
            <span style={{ fontSize: 12, color: "#92400e" }}>
              Code editor puede limitar usabilidad en móvil — usa tablet/desktop para edición.
            </span>
          )}
        </div>
      </header>
      <LazyVisual section={section} />
      <p style={{ marginTop: 16, fontSize: 13 }}>
        <Link href={`/studio/${missionId}`}>← Todas las secciones</Link>
        {" · "}
        <Link href={`/studio/${missionId}/preview`}>Preview</Link>
        {" · "}
        <Link href={`/studio/${missionId}/code`}>Code</Link>
      </p>
    </div>
  );
}
