"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { Notification } from "@/components/ui/fhis/Notification";
import {
  runSelfEvolutionEngine,
  GOVERNANCE_DISCLAIMER,
  DRY_RUN_DISCLAIMER,
  SELF_EVOLUTION_VERSION,
} from "@/lib/self-evolution";
import type { SelfEvolutionSnapshot } from "@/lib/self-evolution";
import { HealthScorePanel } from "./HealthScorePanel";
import { ProposalsPanel } from "./ProposalsPanel";
import { RoiRiskPanel } from "./RoiRiskPanel";
import { ObservationFeedPanel } from "./ObservationFeedPanel";
import { ExecutiveReviewPanel } from "./ExecutiveReviewPanel";
import { ExecutionPlanView } from "./ExecutionPlanView";
import { LoadingState } from "@/components/ui/LoadingState";

interface Props {
  showLabLink?: boolean;
}

export function SelfEvolutionDashboard({ showLabLink = false }: Props) {
  const [snapshot, setSnapshot] = useState<SelfEvolutionSnapshot | null>(null);

  const refresh = useCallback(() => {
    setSnapshot(runSelfEvolutionEngine());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const report = snapshot?.report;
  const mandatoryDemo = useMemo(() => {
    if (!report) return null;
    const titles = [
      "Build lento",
      "duplicado",
      "Ruta sin uso",
      "Founder",
    ];
    const obs = report.observations.filter((o) =>
      titles.some((t) => o.title.includes(t))
    );
    const props = report.proposals.filter((p) =>
      obs.some((o) => p.observationIds.includes(o.id))
    );
    const primary = props[0];
    if (!primary) return null;
    return {
      observations: obs,
      proposal: primary,
      risk: report.riskAssessments.find((r) => r.proposalId === primary.id),
      plan: report.technicalPlans.find((t) => t.proposalId === primary.id),
      branch: report.proposedBranches.find((b) => b.proposalId === primary.id),
      pr: report.proposedPrs.find((p) => p.proposalId === primary.id),
    };
  }, [report]);

  if (!snapshot || !report) {
    return (
      <Container>
        <LoadingState title="Cargando Self Evolution…" description="Motor de auto-evolución (dry-run)" />
      </Container>
    );
  }

  return (
    <Container className="fhis-sevo-dashboard">
      <Stack gap="lg">
        <Notification
          variant="warning"
          title={GOVERNANCE_DISCLAIMER}
          body={`${DRY_RUN_DISCLAIMER}. Governance: Executive Mesh → Capability Layer → Skills → Runtime → Approval Layer → Git Branch → Tests → Review → Merge.`}
        />

        <header className="fhis-sevo-header">
          <div className="fhis-sevo-badges">
            <Badge variant="accent">Program 2035</Badge>
            <Badge variant="default">Self Evolution Engine</Badge>
            <Badge variant="amber">{DRY_RUN_DISCLAIMER}</Badge>
          </div>
          <SectionHeader
            title="Motor de Auto-Evolución ForgeOS"
            subtitle="Observación, propuestas y planes — nunca auto-modifica código sin aprobación humana"
          />
          {showLabLink && (
            <Link href="/lab/self-evolution" className="fhis-btn fhis-btn-ghost fhis-btn-sm">
              Lab harness →
            </Link>
          )}
        </header>

        {mandatoryDemo && (
          <Panel className="fhis-sevo-demo-banner">
            <h3>Caso de uso obligatorio — detecciones activas</h3>
            <ul className="fhis-sevo-demo-detections">
              {mandatoryDemo.observations.map((o) => (
                <li key={o.id}>
                  <Badge variant="amber">{o.severity}</Badge> {o.title}
                </li>
              ))}
            </ul>
            <p className="fhis-sevo-demo-report">
              <strong>Reporte:</strong> {report.id} — generado{" "}
              {new Date(report.generatedAt).toLocaleString("es-ES")}
            </p>
            <p className="fhis-sevo-demo-proposal">
              <strong>Propuesta principal:</strong> {mandatoryDemo.proposal.title} (ROI{" "}
              {mandatoryDemo.proposal.roiScore})
            </p>
            {mandatoryDemo.branch && (
              <p>
                <strong>Branch propuesto:</strong>{" "}
                <code>{mandatoryDemo.branch.branchName}</code>
              </p>
            )}
            {mandatoryDemo.pr && (
              <p>
                <strong>PR propuesto:</strong> {mandatoryDemo.pr.title}
              </p>
            )}
          </Panel>
        )}

        <HealthScorePanel score={report.healthScore} />

        <RoiRiskPanel
          aggregateRoi={snapshot.aggregateRoi}
          aggregateRisk={snapshot.aggregateRisk}
          proposalCount={snapshot.openProposals.length}
        />

        <div className="fhis-sevo-grid-2">
          <ProposalsPanel proposals={snapshot.openProposals} title="Propuestas abiertas" />
          <ProposalsPanel
            proposals={snapshot.approvedProposals}
            title="Propuestas aprobadas"
            emptyLabel="Pendiente de aprobación humana"
          />
        </div>

        <div className="fhis-sevo-grid-2">
          <ProposalsPanel
            proposals={snapshot.inProgressProposals}
            title="En progreso"
            emptyLabel="Ninguna en ejecución"
          />
          <ProposalsPanel
            proposals={snapshot.completedProposals}
            title="Completadas"
            emptyLabel="Ninguna completada"
          />
        </div>

        <ObservationFeedPanel observations={snapshot.observationFeed} />

        <ExecutiveReviewPanel reviews={report.executiveReviews} />

        {mandatoryDemo && (
          <ExecutionPlanView
            plan={mandatoryDemo.plan}
            risk={mandatoryDemo.risk}
            branch={mandatoryDemo.branch}
            pr={mandatoryDemo.pr}
          />
        )}

        <footer className="fhis-sevo-footer">
          <span>Engine {SELF_EVOLUTION_VERSION}</span>
          <span>·</span>
          <span>{report.observations.length} observaciones</span>
          <span>·</span>
          <span>{report.proposals.length} propuestas</span>
        </footer>
      </Stack>
    </Container>
  );
}
