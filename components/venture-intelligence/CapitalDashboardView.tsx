"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buildDemoForgeCapitalClientSnapshot } from "@/lib/forge-capital/client";
import type { ForgeCapitalClientSnapshot } from "@/lib/forge-capital/client";
import { formatValuationEs, HEURISTIC_DISCLAIMER } from "@/lib/venture-intelligence";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Progress } from "@/components/ui/fhis/Progress";
import { ExecutiveCard } from "@/components/ui/fhis/ExecutiveCard";
import { Card } from "@/components/ui/fhis/Card";

export function CapitalDashboardView() {
  const [data, setData] = useState<ForgeCapitalClientSnapshot | null>(null);

  useEffect(() => {
    setData(buildDemoForgeCapitalClientSnapshot());
  }, []);

  if (!data) {
    return (
      <Container>
        <div className="fhis-dashboard-loading">Cargando inteligencia de capital…</div>
      </Container>
    );
  }

  const { intelligence: snap } = data;

  return (
    <Container className="fhis-capital-dashboard">
      <Stack gap="lg">
        <header className="fhis-capital-header">
          <div>
            <p className="fhis-dashboard-kicker">Forge Capital · RC8</p>
            <h1 className="fhis-section-header-title">Capital Intelligence</h1>
            <p className="fhis-founder-header-sub">{snap.ventureName} — dry-run only</p>
          </div>
          <div className="fhis-founder-header-badges">
            <Badge variant="amber">{HEURISTIC_DISCLAIMER}</Badge>
            <Badge variant="default">dry-run</Badge>
            <Link href="/investors" className="fhis-btn fhis-btn-ghost fhis-btn-sm">
              Investor Room →
            </Link>
            <Link href="/lab/venture-intelligence" className="fhis-btn fhis-btn-ghost fhis-btn-sm">
              Lab
            </Link>
          </div>
        </header>

        <Panel className="fhis-capital-executive-summary">
          <SectionHeader title="Resumen ejecutivo" subtitle={`[${HEURISTIC_DISCLAIMER}]`} />
          <p className="fhis-capital-summary-text">
            Tu startup vale aproximadamente{" "}
            <strong>{formatValuationEs(snap.valuation.amountEur)}</strong>.{" "}
            <Badge variant="amber">{snap.valuation.disclaimer}</Badge>
          </p>
          <ul className="fhis-capital-summary-list">
            <li>Runway estimado: <strong>{Math.round(snap.runway.months)} meses</strong></li>
            <li>
              Necesidad de financiación:{" "}
              <strong>{snap.fundraising.amountNeededEur.toLocaleString("es-ES")} €</strong>
            </li>
            <li>Investor readiness: <strong>{snap.investorReadiness.score}%</strong></li>
            <li>
              Riesgos principales: <strong>{snap.risks.topRisks.join(", ")}</strong>
            </li>
            <li>
              Próximo paso recomendado:{" "}
              <strong>{snap.investorReadiness.recommendedNextStep}</strong>
            </li>
          </ul>
        </Panel>

        <div className="fhis-capital-kpi-grid">
          <KpiBlock label="Valoración" value={formatValuationEs(snap.valuation.amountEur)} />
          <KpiBlock label="Runway" value={`${Math.round(snap.runway.months)} meses`} />
          <KpiBlock
            label="Burn rate"
            value={`${snap.burnRate.monthlyBurn.toLocaleString("es-ES")} €/mes`}
          />
          <KpiBlock
            label="Financiación"
            value={`${snap.fundraising.amountNeededEur.toLocaleString("es-ES")} €`}
          />
          <KpiBlock label="Investor readiness" value={`${snap.investorReadiness.score}%`} />
          <KpiBlock label="Risk score" value={`${snap.risks.overallScore}/100`} />
          <KpiBlock label="Growth score" value={`${snap.growthScore.score}/100`} />
          <KpiBlock label="Market score" value={`${snap.marketScore.score}/100`} />
          <KpiBlock label="Exit readiness" value={`${snap.exitStrategy.readinessScore}/100`} />
        </div>

        <div className="fhis-capital-two-col">
          <Panel>
            <SectionHeader title="Scores" subtitle="Venture Intelligence" />
            <Stack gap="md">
              <Progress label="Venture Score" value={snap.ventureScore.score} showValue />
              <Progress label="Growth" value={snap.growthScore.score} showValue />
              <Progress label="Market" value={snap.marketScore.score} showValue />
              <Progress label="Execution" value={snap.executionScore.score} showValue />
              <Progress label="Investor readiness" value={snap.investorReadiness.score} showValue />
            </Stack>
          </Panel>

          <Panel>
            <SectionHeader title="Forecast (12 meses)" subtitle={snap.forecast.disclaimer} />
            <ul className="fhis-capital-forecast-list">
              {snap.forecast.points.filter((_, i) => i % 3 === 2).map((p) => (
                <li key={p.month}>
                  Mes {p.month}: ingresos {p.revenue.toLocaleString("es-ES")} € · caja{" "}
                  {p.cash.toLocaleString("es-ES")} €
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <Panel>
          <SectionHeader title="Due diligence checklist" subtitle={HEURISTIC_DISCLAIMER} />
          <ul className="fhis-capital-dd-list">
            {snap.dueDiligence.map((item) => (
              <li key={item.id} className="fhis-capital-dd-item">
                <span>{item.label}</span>
                <Badge
                  variant={
                    item.status === "ready" ? "accent" : item.status === "partial" ? "amber" : "default"
                  }
                >
                  {item.status === "ready" ? "Listo" : item.status === "partial" ? "Parcial" : "Pendiente"}
                </Badge>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <SectionHeader title="Departamentos AI" subtitle="Simulación heurística" />
          <div className="fhis-capital-ai-grid">
            {data.departments.map((dept) => (
              <ExecutiveCard key={dept.departmentId} name={dept.departmentName} role={dept.mode}>
                <p className="fhis-founder-prose">{dept.insight}</p>
                <Badge variant="amber">{dept.disclaimer}</Badge>
              </ExecutiveCard>
            ))}
          </div>
        </Panel>

        <div className="fhis-capital-two-col">
          <Card>
            <h3>M&A attractiveness</h3>
            <p>{snap.maAnalysis.attractivenessScore}/100</p>
            <p className="fhis-founder-prose">
              Adquirentes potenciales: {snap.maAnalysis.potentialAcquirers.join(", ")}
            </p>
          </Card>
          <Card>
            <h3>Benchmarks</h3>
            <p className="fhis-founder-prose">{snap.benchmarks.sector}</p>
            <ul className="fhis-capital-benchmark-list">
              {snap.benchmarks.metrics.map((m) => (
                <li key={m.label}>
                  {m.label}: {m.ventureValue} {m.unit} ({m.delta})
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </Stack>
    </Container>
  );
}
