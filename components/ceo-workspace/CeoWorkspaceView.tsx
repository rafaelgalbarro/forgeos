"use client";

import Link from "next/link";
import { VANDL_VENTURE_ID } from "@/lib/fixtures/vandl-venture";
import { Container, Grid, Stack } from "@/components/ui/fhis/Layout";
import { PageTemplate } from "@/components/ui/fhis/PageTemplate";
import { Skeleton } from "@/components/ui/fhis/Skeleton";
import { Button } from "@/components/ui/fhis/Button";
import { CeoDirectorMessage } from "./CeoDirectorMessage";
import { DailyAgendaPanel } from "./DailyAgendaPanel";
import { ExecutiveBriefPanel } from "./ExecutiveBriefPanel";
import { NextDecisionsPanel } from "./NextDecisionsPanel";
import { PortfolioStatusPanel } from "./PortfolioStatusPanel";
import { PrioritiesPanel } from "./PrioritiesPanel";
import { RecommendationsPanel } from "./RecommendationsPanel";
import { RisksOpportunitiesPanel } from "./RisksOpportunitiesPanel";
import { SourceBadge } from "./SourceBadge";
import { useCeoWorkspaceData } from "./useCeoWorkspaceData";

function CeoWorkspaceSkeleton() {
  return (
    <Container className="ceo-ws">
      <Stack gap="lg">
        <Skeleton height="120px" />
        <Skeleton height="200px" />
        <Grid cols={2}>
          <Skeleton height="180px" />
          <Skeleton height="180px" />
        </Grid>
      </Stack>
    </Container>
  );
}

function CeoWorkspaceDegraded({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Container className="ceo-ws">
      <div className="ceo-ws-degraded">
        <h3>CEO Workspace — modo degradado</h3>
        <p>{message}</p>
        <div className="ceo-ws-degraded-actions">
          <Button onClick={onRetry}>Reintentar</Button>
          <Link href="/dashboard" className="fhis-btn fhis-btn-ghost">
            Ir al dashboard
          </Link>
        </div>
      </div>
    </Container>
  );
}

export function CeoWorkspaceView() {
  const { data, error, ready, loading, retry } = useCeoWorkspaceData();

  if (!ready || !data) {
    if (error && !data) {
      return <CeoWorkspaceDegraded message={error} onRetry={retry} />;
    }
    return <CeoWorkspaceSkeleton />;
  }

  return (
    <Container className="ceo-ws">
      <PageTemplate
        title="Oficina del Director General"
        subtitle="Executive office · ForgeOS Venture Creator"
      >
        <header className="ceo-ws-toolbar">
          <SourceBadge source={data.source} />
          {loading && <span className="ceo-ws-loading">Actualizando…</span>}
          {data.focusVentureName && (
            <span className="ceo-ws-focus">
              Foco: <strong>{data.focusVentureName}</strong>
            </span>
          )}
          <button type="button" className="fhis-btn fhis-btn-ghost fhis-btn-sm" onClick={retry}>
            Actualizar briefing
          </button>
          <Link href="/founder" className="fhis-btn fhis-btn-ghost fhis-btn-sm">
            Founder
          </Link>
          <Link href="/creator" className="fhis-btn fhis-btn-ghost fhis-btn-sm">
            Creator
          </Link>
          <Link href={`/venture/${VANDL_VENTURE_ID}`} className="fhis-btn fhis-btn-ghost fhis-btn-sm">
            VANDL
          </Link>
          <Link href="/lab/rc1" className="fhis-btn fhis-btn-ghost fhis-btn-sm">
            RC1 Lab
          </Link>
        </header>

        {error && (
          <p className="ceo-ws-banner" role="status">
            Modo parcial: {error}
          </p>
        )}

        {data.warnings.length > 0 && (
          <p className="ceo-ws-banner ceo-ws-banner-muted" role="status">
            {data.warnings.join(" · ")}
          </p>
        )}

        <Stack gap="lg">
          <CeoDirectorMessage narrative={data.narrative} />

          <ExecutiveBriefPanel
            brief={data.executiveBrief}
            confidence={data.confidence}
            timeHorizon={data.timeHorizon}
          />

          <Grid cols={2} gap="lg">
            <PrioritiesPanel priorities={data.priorities} />
            <RecommendationsPanel recommendations={data.recommendations} />
          </Grid>

          <RisksOpportunitiesPanel risks={data.risks} opportunities={data.opportunities} />

          <Grid cols={2} gap="lg">
            <NextDecisionsPanel
              decisions={data.nextDecisions}
              consensusLevel={data.consensusLevel}
            />
            <DailyAgendaPanel agenda={data.agenda} />
          </Grid>

          <PortfolioStatusPanel portfolio={data.portfolio} />
        </Stack>
      </PageTemplate>
    </Container>
  );
}
