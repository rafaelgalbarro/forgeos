"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getVentures, deleteVenture } from "@/lib/store/ventures";
import type { VentureProject } from "@/lib/domain/venture";
import { VentureCard } from "@/components/ui/fhis/VentureCard";
import { EmptyState } from "@/components/ui/fhis/EmptyState";
import { Button } from "@/components/ui/fhis/Button";
import { Grid } from "@/components/ui/fhis/Layout";
import { cn } from "@/lib/design-system/cn";

const STATUS: Record<string, string> = {
  intelligence: "Análisis",
  building: "Construyendo",
  ready: "Listo",
};

export function ProjectsList() {
  const [ventures, setVentures] = useState<VentureProject[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setVentures(getVentures());
    setLoaded(true);
  }, []);

  function handleDelete(id: string) {
    deleteVenture(id);
    setVentures(getVentures());
  }

  if (!loaded) {
    return <p style={{ color: "var(--fhis-color-text-muted)" }}>Cargando...</p>;
  }

  if (ventures.length === 0) {
    return (
      <EmptyState
        icon="◫"
        title="Aún no hay startups"
        description="Describe tu idea en ForgeOS y construye tu primera empresa digital."
      >
        <Link href="/" className={cn("fhis-btn", "fhis-btn-primary", "fhis-btn-md")}>
          + Crear Empresa
        </Link>
      </EmptyState>
    );
  }

  return (
    <Grid cols={2} gap="md">
      {ventures.map((v) => (
        <article key={v.id} className="fhis-stack fhis-stack-gap-md">
          <VentureCard
            title={v.name}
            description={`${v.ideaText.slice(0, 120)}${v.ideaText.length > 120 ? "…" : ""}`}
            tags={[
              STATUS[v.status] ?? v.status,
              v.targetAudience,
              v.sections.length ? `${v.sections.length} documentos` : "Sin documentos",
            ]}
          />
          <div style={{ display: "flex", gap: "var(--fhis-space-2)", flexWrap: "wrap" }}>
            {v.status === "ready" ? (
              <Link href={`/venture/${v.id}`} className={cn("fhis-btn", "fhis-btn-primary", "fhis-btn-sm")}>
                Abrir workspace
              </Link>
            ) : v.status === "building" ? (
              <Link href={`/build/${v.id}`} className={cn("fhis-btn", "fhis-btn-secondary", "fhis-btn-sm")}>
                Continuar
              </Link>
            ) : (
              <Link href={`/intelligence/${v.id}`} className={cn("fhis-btn", "fhis-btn-secondary", "fhis-btn-sm")}>
                Ver análisis
              </Link>
            )}
            <Button type="button" variant="ghost" size="sm" onClick={() => handleDelete(v.id)}>
              Eliminar
            </Button>
          </div>
        </article>
      ))}
    </Grid>
  );
}
