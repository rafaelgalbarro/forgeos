"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { PageTemplate } from "@/components/ui/fhis/PageTemplate";
import { Card } from "@/components/ui/fhis/Card";
import { Button } from "@/components/ui/fhis/Button";
import { Badge } from "@/components/ui/fhis/Badge";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { ExecutiveCard } from "@/components/ui/fhis/ExecutiveCard";
import { Container, Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Progress } from "@/components/ui/fhis/Progress";
import {
  buildOrganizationSnapshot,
  respondToBriefing,
  type BriefingDecision,
  type OrganizationSnapshot,
} from "@/lib/autonomous-organization";

interface Props {
  showLabLink?: boolean;
}

export function OrganizationView({ showLabLink = false }: Props) {
  const [snapshot, setSnapshot] = useState<OrganizationSnapshot>(() => buildOrganizationSnapshot());
  const { briefing } = snapshot;

  const refresh = useCallback(() => {
    setSnapshot(buildOrganizationSnapshot());
  }, []);

  const handleDecision = useCallback(
    (decision: BriefingDecision) => {
      const updated = respondToBriefing(briefing.id, decision);
      setSnapshot((prev) => ({ ...prev, briefing: updated }));
    },
    [briefing.id]
  );

  const decisionLabel = useMemo(() => {
    switch (briefing.decision) {
      case "accepted":
        return "Aceptado";
      case "modified":
        return "Modificado";
      case "rejected":
        return "Rechazado";
      default:
        return "Pendiente";
    }
  }, [briefing.decision]);

  return (
    <PageTemplate
      title="Organización Ejecutiva Autónoma"
      subtitle="RC6.5 — ForgeOS trabaja por ti: prioridades, riesgos y coordinación cross-departamento"
    >
      <Container>
        {showLabLink && (
          <p>
            <Link href="/lab/autonomous-organization">Abrir lab de ingeniería →</Link>
          </p>
        )}

        <Card className="fhis-org-briefing">
          <ExecutiveCard name="CEO" role="Chief Executive Officer">
            <p className="fhis-org-greeting">{briefing.greeting}</p>
            <p className="fhis-org-section-label">Durante la noche:</p>
            <ul className="fhis-org-insights">
              {briefing.overnightInsights.map((insight) => (
                <li key={insight.id}>{insight.message}</li>
              ))}
            </ul>
            <p className="fhis-org-recommendation">{briefing.recommendation}</p>

            {briefing.decision === "pending" ? (
              <div className="fhis-org-actions">
                <Button onClick={() => handleDecision("accepted")}>Aceptar</Button>
                <Button variant="secondary" onClick={() => handleDecision("modified")}>
                  Modificar
                </Button>
                <Button variant="secondary" onClick={() => handleDecision("rejected")}>
                  Rechazar
                </Button>
              </div>
            ) : (
              <Badge variant="accent">Decisión: {decisionLabel}</Badge>
            )}
          </ExecutiveCard>
        </Card>

        <div className="fhis-org-kpi-grid">
          <KpiBlock label="Executive Health Score" value={`${snapshot.healthScore}/100`} />
          <KpiBlock label="Prioridades CEO" value={briefing.priorities.length} />
          <KpiBlock label="Riesgos detectados" value={briefing.risks.length} />
          <KpiBlock label="Iniciativas activas" value={briefing.initiatives.length} />
        </div>

        <SectionHeader title="Prioridades dinámicas" />
        <div className="fhis-org-priority-grid">
          {briefing.priorities.map((p) => (
            <Card key={p.id} className="fhis-org-priority-card">
              <Badge variant={p.level === "critical" ? "red" : "default"}>
                #{p.rank} · {p.level}
              </Badge>
              <h3>{p.title}</h3>
              <p>{p.rationale}</p>
            </Card>
          ))}
        </div>

        <div className="fhis-org-two-col">
          <Panel>
            <SectionHeader title="Riesgos detectados" />
            <ul className="fhis-org-list">
              {briefing.risks.map((r) => (
                <li key={r.id}>
                  <Badge variant={r.severity === "high" ? "red" : "default"}>{r.severity}</Badge>
                  <strong>{r.title}</strong>
                  {r.mitigation && <span className="fhis-org-muted"> — {r.mitigation}</span>}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel>
            <SectionHeader title="Weekly Board Meeting" />
            <p>
              <strong>Próxima sesión:</strong>{" "}
              {new Date(snapshot.boardMeeting.scheduledAt).toLocaleString("es-ES")}
            </p>
            <ul className="fhis-org-list">
              {snapshot.boardMeeting.agenda.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Panel>
        </div>

        <SectionHeader title="Carga de trabajo y capacidad" />
        <div className="fhis-org-workload-grid">
          {briefing.workload.map((w) => (
            <Card key={w.departmentId} className="fhis-org-workload-card">
              <h4>{w.label}</h4>
              <Progress value={w.loadPercent} max={100} />
              <p className="fhis-org-muted">
                Carga {w.loadPercent}% · Capacidad {w.capacityPercent}% · {w.activeTasks} tareas
              </p>
            </Card>
          ))}
        </div>

        <div className="fhis-org-two-col">
          <Panel>
            <SectionHeader title="KPIs por departamento" />
            <div className="fhis-org-kpi-grid">
              {snapshot.kpis.map((k) => (
                <KpiBlock
                  key={k.id}
                  label={`${k.label} (${k.departmentId})`}
                  value={`${k.value} ${k.unit}`}
                />
              ))}
            </div>
          </Panel>

          <Panel>
            <SectionHeader title="Iniciativas activas" />
            <ul className="fhis-org-list">
              {briefing.initiatives.map((i) => (
                <li key={i.id}>
                  <strong>{i.title}</strong>
                  <Progress value={i.progress} max={100} />
                  <span className="fhis-org-muted">
                    {i.owner} · {i.status} · {i.progress}%
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <Button variant="secondary" onClick={refresh}>
          Actualizar briefing
        </Button>
      </Container>
    </PageTemplate>
  );
}
