"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CeoCard } from "@/components/ui/fhis/CeoCard";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Grid } from "@/components/ui/fhis/Layout";
import { Button } from "@/components/ui/fhis/Button";
import { EmptyState } from "@/components/ui/fhis/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import {
  DEFAULT_HOME_SUMMARY,
  type HomeSummary,
} from "@/lib/home/home-summary-types";

interface HomeInsightPanelsProps {
  summary?: HomeSummary | null;
  loading?: boolean;
  error?: string | null;
}

export function HomeInsightPanels({
  summary: summaryProp,
  loading: loadingProp,
  error: errorProp,
}: HomeInsightPanelsProps) {
  const [clientSummary, setClientSummary] = useState<HomeSummary | null>(
    summaryProp ?? null
  );
  const [clientLoading, setClientLoading] = useState(
    summaryProp == null && !errorProp
  );
  const [clientError, setClientError] = useState<string | null>(null);

  useEffect(() => {
    if (summaryProp != null) {
      setClientSummary(summaryProp);
      setClientLoading(false);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const { loadHomeSummary } = await import("@/lib/home/home-summary");
        if (cancelled) return;
        setClientSummary(loadHomeSummary());
        setClientError(null);
      } catch (err) {
        if (cancelled) return;
        setClientError(
          err instanceof Error ? err.message : "No se pudo cargar el snapshot"
        );
      } finally {
        if (!cancelled) setClientLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [summaryProp]);

  const loading = loadingProp ?? clientLoading;
  const error = errorProp ?? clientError;
  const resolved = summaryProp ?? clientSummary;
  const summary = resolved ?? DEFAULT_HOME_SUMMARY;

  if (loading) {
    return (
      <LoadingState
        title="Cargando panorama…"
        description="Snapshot ligero del portfolio"
      />
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Panorama no disponible"
        description={error}
      >
        <Link href="/command-center">
          <Button variant="ghost" size="sm">
            Abrir Command Center →
          </Button>
        </Link>
      </ErrorState>
    );
  }

  if (resolved && resolved.venturesCount === 0) {
    return (
      <EmptyState
        title="Sin ventures todavía"
        description="Crea tu primera empresa para ver métricas aquí."
      >
        <Link href="/command-center">
          <Button variant="ghost" size="sm">
            Ir al Command Center →
          </Button>
        </Link>
      </EmptyState>
    );
  }

  const detailHref = summary.detailHref ?? "/command-center";

  return (
    <div style={{ display: "grid", gap: "var(--fhis-space-6)" }}>
      <CeoCard title="Hoy el CEO recomienda…" subtitle="Snapshot ligero del portfolio">
        <div style={{ display: "grid", gap: 10, fontSize: 14 }}>
          <div>
            <span style={{ color: "var(--fhis-color-text-muted)", fontSize: 12 }}>
              Venture pendiente
            </span>
            <p style={{ margin: "4px 0 0" }}>{summary.venturePending ?? "Sin ventures activos"}</p>
          </div>
          <div>
            <span style={{ color: "var(--fhis-color-text-muted)", fontSize: 12 }}>
              Siguiente tarea
            </span>
            <p style={{ margin: "4px 0 0" }}>
              {summary.nextAction ?? DEFAULT_HOME_SUMMARY.nextAction}
            </p>
          </div>
          <div>
            <span style={{ color: "var(--fhis-color-text-muted)", fontSize: 12 }}>
              Riesgo principal
            </span>
            <p style={{ margin: "4px 0 0" }}>
              {summary.primaryRisk ?? DEFAULT_HOME_SUMMARY.primaryRisk}
            </p>
          </div>
          <div>
            <span style={{ color: "var(--fhis-color-text-muted)", fontSize: 12 }}>
              Recomendación CEO
            </span>
            <p style={{ margin: "4px 0 0" }}>
              {summary.ceoRecommendation ?? DEFAULT_HOME_SUMMARY.ceoRecommendation}
            </p>
          </div>
        </div>
        <Link href={detailHref} style={{ marginTop: 12, display: "inline-block" }}>
          <Button variant="ghost" size="sm">
            Ver detalle en Command Center →
          </Button>
        </Link>
      </CeoCard>

      <Grid cols={4} gap="md" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
        <KpiBlock label="Ventures" value={summary.venturesCount ?? 0} />
        <KpiBlock label="Builds" value={summary.buildsCount ?? 0} />
        <KpiBlock label="Deploys" value={summary.deploymentsCount ?? 0} />
        <KpiBlock label="AI Providers" value={summary.aiProvidersCount ?? 0} />
        <KpiBlock label="Health" value={`${summary.healthStatus ?? 0}%`} />
      </Grid>
    </div>
  );
}
