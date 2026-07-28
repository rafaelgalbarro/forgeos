"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import type { VentureProject } from "@/lib/domain/venture";
import {
  getSimulatorOverrides,
  hasActiveOverrides,
  runVentureSimulator,
  saveSimulatorOverrides,
  ventureToSimulatorInput,
  type VentureSimulatorOverrides,
  type VentureSimulatorResult,
} from "@/lib/venture-simulator";
import { SimulatorOverridesForm } from "./SimulatorOverridesForm";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import { Notification } from "@/components/ui/fhis/Notification";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { SimulatorCard } from "@/components/ui/fhis/SimulatorCard";

interface PreBuildVentureDecisionProps {
  venture: VentureProject;
  onProceed: (result: VentureSimulatorResult, overrides: VentureSimulatorOverrides) => void;
  onBack: () => void;
  onMoreQuestions: () => void;
  onRevisitApproach: () => void;
}

const CONFIDENCE_LABELS = { alta: "Alta", media: "Media", baja: "Baja" } as const;

export function PreBuildVentureDecision({
  venture,
  onProceed,
  onBack,
  onMoreQuestions,
  onRevisitApproach,
}: PreBuildVentureDecisionProps) {
  const [overrides, setOverrides] = useState<VentureSimulatorOverrides>({});
  const [showOverrides, setShowOverrides] = useState(false);
  const [confirmRiskyBuild, setConfirmRiskyBuild] = useState(false);

  const simulatorInput = useMemo(() => ventureToSimulatorInput(venture), [venture]);

  useEffect(() => {
    setOverrides(getSimulatorOverrides(venture.id));
  }, [venture.id]);

  const result = useMemo(
    () => runVentureSimulator(simulatorInput, hasActiveOverrides(overrides) ? overrides : undefined),
    [simulatorInput, overrides]
  );

  function handleOverridesChange(next: VentureSimulatorOverrides) {
    setOverrides(next);
    saveSimulatorOverrides(venture.id, next);
  }

  function handlePrimaryBuild() {
    if (!result) return;
    if (result.recommendation === "do_not_build_yet" && !confirmRiskyBuild) {
      setConfirmRiskyBuild(true);
      return;
    }
    onProceed(result, overrides);
  }

  if (!result) return null;

  const defaultHints = {
    monthlyPrice: result.assumptions.revenuePerUserYear1 / 12,
    estimatedCAC: result.assumptions.baseCAC,
    monthlyChurnPercent: result.assumptions.baseChurnMonthly,
    monthlyBurn: result.assumptions.monthlyBurnEstimate,
    estimatedConversion: result.assumptions.baseConversion,
  };

  const primaryLabel =
    result.recommendation === "build"
      ? "Construir Startup"
      : result.recommendation === "build_small_mvp"
        ? "Construir MVP pequeño"
        : result.recommendation === "do_not_build_yet" && confirmRiskyBuild
          ? "Construir de todos modos"
          : "Continuar con build";

  return (
    <Panel className="prebuild-decision">
      <header className="prebuild-decision-header">
        <SectionHeader
          title="Venture Simulator — Decisión pre-build"
          description="Simulación estratégica antes de comprometer el workflow de construcción."
        />
        {result.customAssumptions && (
          <Badge variant="blue">Custom assumptions</Badge>
        )}
      </header>

      <div className="fhis-sim-score-row">
        <SimulatorCard title="Venture Score" value={result.ventureScore} />
        <Panel>
          <span style={{ fontSize: "var(--fhis-text-xs)", color: "var(--fhis-color-text-muted)", textTransform: "uppercase" }}>Recomendación</span>
          <strong style={{ display: "block", fontSize: "var(--fhis-text-lg)" }}>{result.recommendationLabel}</strong>
          <span style={{ fontSize: "var(--fhis-text-sm)", color: "var(--fhis-color-text-muted)" }}>
            Confianza: {CONFIDENCE_LABELS[result.confidence]}
          </span>
        </Panel>
      </div>

      <div className="prebuild-insights fhis-sim-insights-grid">
        <Panel>
          <SectionHeader title="Riesgos principales" />
          <ul>
            {result.risks.slice(0, 3).map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <SectionHeader title="Oportunidades" />
          <ul>
            {result.opportunities.slice(0, 3).map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <SectionHeader title="Alternativas recomendadas" />
          <ul>
            {result.recommendedAlternatives.slice(0, 3).map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </Panel>
      </div>

      <Notification
        title="Siguiente acción sugerida"
        body={result.suggestedNextAction}
        variant="info"
      />

      {result.recommendation === "do_not_build_yet" && (
        <Notification
          title="ForgeOS no recomienda construir todavía"
          body={
            confirmRiskyBuild
              ? "El Venture Score y los riesgos detectados sugieren pausar. Puedes continuar bajo tu responsabilidad — el build no estará bloqueado."
              : "El Venture Score y los riesgos detectados sugieren pausar, aclarar Discovery o pivotar antes de invertir en workers."
          }
          variant="warning"
        />
      )}

      <Button type="button" variant="ghost" size="sm" onClick={() => setShowOverrides((v) => !v)}>
        {showOverrides ? "Ocultar supuestos" : "Ajustar supuestos económicos"}
      </Button>

      {showOverrides && (
        <SimulatorOverridesForm
          overrides={overrides}
          defaults={defaultHints}
          onChange={handleOverridesChange}
          compact
        />
      )}

      <div className="prebuild-actions">
        <Button type="button" variant="ghost" onClick={onBack}>
          Volver a editar idea
        </Button>

        <div className="prebuild-actions-primary">
          {(result.recommendation === "pivot" || result.recommendation === "research_more") && (
            <Button
              type="button"
              variant="secondary"
              onClick={result.recommendation === "pivot" ? onRevisitApproach : onMoreQuestions}
            >
              {result.recommendation === "pivot" ? "Revisar enfoque" : "Responder más preguntas"}
            </Button>
          )}

          <Button
            type="button"
            variant="primary"
            size="lg"
            onClick={handlePrimaryBuild}
          >
            {primaryLabel} →
          </Button>
        </div>
      </div>
    </Panel>
  );
}
