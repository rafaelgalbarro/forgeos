"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Container,
  Panel,
  Stack,
  Grid,
  SectionHeader,
  Badge,
  Progress,
  KpiBlock,
  Notification,
  Button,
} from "@/components/ui/fhis";
import {
  runVentureValidationEngine,
  FOUNDER_ZERO_DISCLAIMER,
  FOUNDER_ZERO_VERSION,
  touchFounderZeroSession,
} from "@/lib/founder-zero";
import type { FounderZeroSnapshot, ChecklistStatus } from "@/lib/founder-zero";
import { VANDL_VENTURE_ID } from "@/lib/fixtures/vandl-venture";
import { ensureVandlSeeded } from "@/lib/store/vandl-seed";

function statusVariant(status: ChecklistStatus): "default" | "accent" | "amber" | "red" {
  switch (status) {
    case "completed":
      return "accent";
    case "in_progress":
      return "amber";
    case "blocked":
      return "red";
    default:
      return "default";
  }
}

function statusLabel(status: ChecklistStatus): string {
  const map: Record<ChecklistStatus, string> = {
    not_started: "No iniciado",
    in_progress: "En progreso",
    completed: "Completado",
    blocked: "Bloqueado",
  };
  return map[status];
}

interface Props {
  showLabLink?: boolean;
}

export function FounderZeroDashboard({ showLabLink = false }: Props) {
  const [snapshot, setSnapshot] = useState<FounderZeroSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      ensureVandlSeeded();
      touchFounderZeroSession(VANDL_VENTURE_ID);
      const result = await runVentureValidationEngine(VANDL_VENTURE_ID);
      setSnapshot(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error en validación");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (loading && !snapshot) {
    return (
      <Container>
        <Notification variant="info" title="Validando venture…" body="Ejecutando pipeline Founder Zero" />
      </Container>
    );
  }

  if (error && !snapshot) {
    return (
      <Container>
        <Notification variant="error" title="Error" body={error} />
        <Button onClick={() => void refresh()}>Reintentar</Button>
      </Container>
    );
  }

  if (!snapshot) return null;

  const blocked = snapshot.stages.filter((s) => s.status === "blocked");
  const completed = snapshot.stages.filter((s) => s.status === "completed");

  return (
    <Container className="fhis-fz-dashboard">
      <Stack gap="lg">
        <Notification
          variant="info"
          title={FOUNDER_ZERO_VERSION}
          body={`${FOUNDER_ZERO_DISCLAIMER} Venture de validación: ${snapshot.venture.name}.`}
        />

        <header className="fhis-fz-header">
          <div className="fhis-fz-badges">
            <Badge variant="accent">Founder Zero</Badge>
            <Badge variant="default">{snapshot.venture.name}</Badge>
            <Badge variant="amber">Score {snapshot.scores.overallVentureScore}/100</Badge>
            {showLabLink && (
              <Link href="/lab/founder-zero" className="fhis-fz-lab-link">
                Abrir Lab →
              </Link>
            )}
          </div>
          <p className="fhis-fz-sub">
            Pipeline de validación — {snapshot.progress.completedCount}/{snapshot.progress.totalCount} etapas
            ({snapshot.progress.percent}%)
          </p>
        </header>

        <Grid cols={4} gap="md">
          <KpiBlock label="Health Score" value={`${snapshot.health.score}`} />
          <KpiBlock label="Venture Score" value={`${snapshot.scores.overallVentureScore}`} />
          <KpiBlock label="Confidence CEO" value={`${snapshot.ceo.confidenceScore}%`} />
          <KpiBlock label="Etapas OK" value={`${snapshot.progress.completedCount}/${snapshot.progress.totalCount}`} />
        </Grid>

        <Progress value={snapshot.progress.percent} label="Progreso del pipeline" />

        <Grid cols={2} gap="lg">
          <Panel>
            <SectionHeader title="Executive Summary" subtitle="CEO Engine" />
            <p className="fhis-fz-text">{snapshot.ceo.executiveSummary}</p>
            <Stack gap="sm">
              <strong>Readiness:</strong> {snapshot.ceo.overallReadiness}
              <strong>Riesgos:</strong>
              <ul className="fhis-fz-list">
                {snapshot.ceo.currentRisks.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <strong>Próximas acciones:</strong>
              <ul className="fhis-fz-list">
                {snapshot.ceo.nextActions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </Stack>
          </Panel>

          <Panel>
            <SectionHeader title="Venture Scores" subtitle="Venture Intelligence" />
            <Grid cols={2} gap="sm">
              {(
                [
                  ["Market", snapshot.scores.marketScore],
                  ["Business", snapshot.scores.businessScore],
                  ["Execution", snapshot.scores.executionScore],
                  ["Product", snapshot.scores.productScore],
                  ["Financial", snapshot.scores.financialScore],
                  ["Growth", snapshot.scores.growthScore],
                  ["Risk", snapshot.scores.riskScore],
                ] as const
              ).map(([label, score]) => (
                <div key={label} className="fhis-fz-score-row">
                  <span>{label}</span>
                  <strong>{score}</strong>
                </div>
              ))}
            </Grid>
          </Panel>
        </Grid>

        <Panel>
          <SectionHeader title="Readiness" subtitle="Prototype → Launch" />
          <Grid cols={4} gap="sm">
            <Badge variant={snapshot.readiness.prototypeReady ? "accent" : "default"}>Prototype</Badge>
            <Badge variant={snapshot.readiness.mvpReady ? "accent" : "default"}>MVP</Badge>
            <Badge variant={snapshot.readiness.betaReady ? "accent" : "default"}>Beta</Badge>
            <Badge variant={snapshot.readiness.investorReady ? "accent" : "default"}>Investor</Badge>
          </Grid>
          <div className="fhis-fz-badges" style={{ marginTop: "0.5rem" }}>
            <Badge variant={snapshot.readiness.launchReady ? "accent" : "default"}>Launch</Badge>
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Pipeline — 21 etapas" subtitle="Venture Validation" />
          <div className="fhis-fz-pipeline">
            {snapshot.stages.map((stage) => (
              <div key={stage.id} className="fhis-fz-stage-row">
                <span className="fhis-fz-stage-order">{stage.order}</span>
                <span className="fhis-fz-stage-label">{stage.label}</span>
                <Badge variant={statusVariant(stage.status)}>{statusLabel(stage.status)}</Badge>
                <span className="fhis-fz-stage-module">{stage.moduleUsed}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Grid cols={2} gap="lg">
          <Panel>
            <SectionHeader title="Riesgos" subtitle={`${blocked.length} bloqueados`} />
            <ul className="fhis-fz-list">
              {blocked.length === 0 ? (
                <li>Sin etapas bloqueadas</li>
              ) : (
                blocked.map((s) => (
                  <li key={s.id}>
                    <strong>{s.label}:</strong> {s.resultSummary}
                  </li>
                ))
              )}
            </ul>
          </Panel>
          <Panel>
            <SectionHeader title="Completados" subtitle={`${completed.length} etapas`} />
            <ul className="fhis-fz-list fhis-fz-list-compact">
              {completed.map((s) => (
                <li key={s.id}>{s.label}</li>
              ))}
            </ul>
          </Panel>
        </Grid>

        <Panel>
          <SectionHeader title="Executive Mesh — Departamentos" subtitle="10 departamentos" />
          <Grid cols={2} gap="md">
            {snapshot.departments.map((d) => (
              <div key={d.departmentId} className="fhis-fz-dept-card">
                <strong>{d.label}</strong>
                <p>{d.result}</p>
                {d.risks.length > 0 && <small>Riesgos: {d.risks.join(", ")}</small>}
              </div>
            ))}
          </Grid>
        </Panel>

        <div className="fhis-fz-actions">
          <Button onClick={() => void refresh()} disabled={loading}>
            {loading ? "Validando…" : "Re-ejecutar validación"}
          </Button>
        </div>
      </Stack>
    </Container>
  );
}
