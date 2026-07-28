"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PreBuildVentureDecision } from "@/components/studio/PreBuildVentureDecision";
import { scoreLabel } from "@/lib/intelligence";
import { clearSimulatorOverrides, hasActiveOverrides } from "@/lib/venture-simulator";
import type { VentureProject } from "@/lib/domain/venture";
import { getVentureById, saveVenture } from "@/lib/store/ventures";
import type { VentureSimulatorOverrides, VentureSimulatorResult } from "@/lib/venture-simulator";
import { Badge } from "@/components/ui/fhis/Badge";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { CeoCard } from "@/components/ui/fhis/CeoCard";
import { Container } from "@/components/ui/fhis/Layout";

interface IntelligenceReportViewProps {
  venture: VentureProject;
}

const PRIORITY_LABELS = { alta: "Alta", media: "Media", baja: "Baja" };
const PRIORITY_VARIANT = { alta: "red" as const, media: "amber" as const, baja: "default" as const };

export function IntelligenceReportView({ venture }: IntelligenceReportViewProps) {
  const router = useRouter();
  const report = venture.intelligenceReport!;

  function handleProceed(result: VentureSimulatorResult, overrides: VentureSimulatorOverrides) {
    const current = getVentureById(venture.id);
    if (!current) return;
    saveVenture({
      ...current,
      status: "building",
      intelligenceAccepted: true,
      ventureSimulatorResult: result,
      ventureSimulatorOverrides: hasActiveOverrides(overrides) ? overrides : null,
      updatedAt: new Date().toISOString(),
    });
    clearSimulatorOverrides(venture.id);
    router.push(`/build/${venture.id}`);
  }

  return (
    <div className="studio">
      <header className="studio-header">
        <Link href="/" className="fhis-sidebar-logo">Forge<span>OS</span></Link>
        <Badge variant="accent">Forge Intelligence</Badge>
      </header>

      <Container>
        <main className="intelligence-main">
          <SectionHeader
            title="Forge Intelligence Report"
            description="Análisis estratégico antes de construir. Revisa las recomendaciones de tu cofundador virtual."
          />

          <Panel className="fhis-intelligence-score-row">
            <KpiBlock label="Startup Score" value={`${report.startupScore}/100`} />
            <div>
              <strong style={{ fontSize: "var(--fhis-text-lg)" }}>{scoreLabel(report.startupScore)}</strong>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--fhis-space-4)", marginTop: "var(--fhis-space-3)" }}>
                <span>Prioridad: <Badge variant={PRIORITY_VARIANT[report.launchPriority]}>{PRIORITY_LABELS[report.launchPriority]}</Badge></span>
                <span>MVP: <strong>{report.estimatedMvpTime}</strong></span>
                <span>Complejidad: <strong>{report.technicalComplexity}</strong></span>
              </div>
            </div>
          </Panel>

          <div className="intelligence-grid">
            <Panel>
              <SectionHeader title="Modelo de negocio recomendado" />
              <p className="intelligence-highlight">{report.recommendedBusinessModel}</p>
              <p className="intelligence-reason">{report.businessModel.reasoning}</p>
            </Panel>

            <Panel>
              <SectionHeader title="Mercado" />
              <dl className="intelligence-dl">
                <div><dt>TAM</dt><dd>{report.market.tamEstimate}</dd></div>
                <div><dt>Competencia</dt><dd>{report.market.competitionLevel}</dd></div>
                <div><dt>Éxito estimado</dt><dd>{report.market.successProbability}</dd></div>
                <div><dt>Coste desarrollo</dt><dd>{report.estimatedDevelopmentCost}</dd></div>
              </dl>
            </Panel>

            <Panel className="intelligence-section-wide">
              <SectionHeader title="Founder Advisor" />
              <CeoCard title={report.founderAdvisor.headline} subtitle="Cofundador virtual">
                <p style={{ margin: 0 }}>{report.founderAdvisor.summary}</p>
              </CeoCard>

              <div className="intelligence-subsection">
                <h3>Riesgos principales</h3>
                <ul className="intelligence-list">
                  {report.risks.map((r) => (
                    <li key={r.title}>
                      <Badge variant={r.severity === "alta" ? "red" : r.severity === "media" ? "amber" : "default"}>
                        {r.severity}
                      </Badge>{" "}
                      <strong>{r.title}</strong> — {r.description}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="intelligence-subsection">
                <h3>Oportunidades detectadas</h3>
                <ul className="intelligence-list">
                  {report.opportunities.map((o) => (
                    <li key={o.title}>
                      <strong>{o.title}</strong> ({o.probability}) — {o.description}
                    </li>
                  ))}
                </ul>
              </div>

              {report.founderAdvisor.alternatives.length > 0 && (
                <div className="intelligence-subsection">
                  <h3>Alternativas con mayor probabilidad de éxito</h3>
                  <ul className="intelligence-list">
                    {report.founderAdvisor.alternatives.map((a) => (
                      <li key={a.title}>
                        <strong>{a.title}</strong> — {a.description}
                        <em className="intelligence-rationale">{a.rationale}</em>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="intelligence-subsection">
                <h3>Preguntas clave</h3>
                <ul className="intelligence-list">
                  {report.founderAdvisor.questions.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
              </div>

              <div className="intelligence-subsection">
                <h3>Recomendaciones</h3>
                <ul className="intelligence-recommendations">
                  {report.founderAdvisor.recommendations.map((rec, i) => (
                    <li key={i}>
                      <strong>{rec.text}</strong>
                      <span className="intelligence-rationale">Motivo: {rec.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </Panel>

            <Panel>
              <SectionHeader title="Competencia" />
              <p>{report.competition.landscape}</p>
              <ul className="intelligence-list compact">
                {report.competition.incumbents.map((inc) => (
                  <li key={inc}>{inc}</li>
                ))}
              </ul>
              <p className="intelligence-reason"><strong>Ventana:</strong> {report.competition.windowOfOpportunity}</p>
            </Panel>
          </div>

          <PreBuildVentureDecision
            venture={venture}
            onProceed={handleProceed}
            onBack={() => router.push("/")}
            onMoreQuestions={() => router.push("/")}
            onRevisitApproach={() => router.push("/")}
          />
        </main>
      </Container>
    </div>
  );
}
