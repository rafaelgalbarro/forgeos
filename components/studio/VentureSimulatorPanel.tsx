"use client";

import { useEffect, useMemo, useState } from "react";
import type { VentureProject } from "@/lib/domain/venture";
import {
  getSimulatorOverrides,
  hasActiveOverrides,
  runVentureSimulator,
  saveSimulatorOverrides,
  ventureToSimulatorInput,
  overridesMatch,
  type VentureSimulatorOverrides,
  type VentureSimulatorResult,
} from "@/lib/venture-simulator";
import type { VentureSimulatorInput } from "@/lib/venture-simulator";
import { SimulatorOverridesForm } from "./SimulatorOverridesForm";
import { Badge } from "@/components/ui/fhis/Badge";
import { Button } from "@/components/ui/fhis/Button";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { SimulatorCard } from "@/components/ui/fhis/SimulatorCard";
import { EmptyState } from "@/components/ui/fhis/EmptyState";

interface VentureSimulatorPanelProps {
  venture?: VentureProject;
  input?: VentureSimulatorInput;
}

const CONFIDENCE_LABELS = { alta: "Alta", media: "Media", baja: "Baja" } as const;

const SCENARIO_LABELS = {
  conservador: "Conservador",
  base: "Base",
  optimista: "Optimista",
} as const;

function formatCurrency(value: number): string {
  if (value >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `€${Math.round(value / 1_000)}K`;
  return `€${value}`;
}

export function VentureSimulatorPanel({ venture, input }: VentureSimulatorPanelProps) {
  const projectId = venture?.id;
  const [overrides, setOverrides] = useState<VentureSimulatorOverrides>({});
  const [overridesDirty, setOverridesDirty] = useState(false);
  const [showOverrides, setShowOverrides] = useState(false);

  const simulatorInput = useMemo(
    () => input ?? (venture ? ventureToSimulatorInput(venture) : null),
    [venture, input]
  );

  useEffect(() => {
    if (!projectId) return;
    const stored = getSimulatorOverrides(projectId);
    const fromVenture = venture?.ventureSimulatorOverrides ?? {};
    const merged = { ...fromVenture, ...stored };
    setOverrides(merged);
    setOverridesDirty(false);
  }, [projectId, venture?.ventureSimulatorOverrides]);

  const result = useMemo(() => {
    if (!simulatorInput) return null;

    const activeOverrides = hasActiveOverrides(overrides) ? overrides : undefined;
    if (
      venture?.ventureSimulatorResult &&
      !overridesDirty &&
      (!hasActiveOverrides(overrides) ||
        overridesMatch(overrides, venture.ventureSimulatorOverrides))
    ) {
      return venture.ventureSimulatorResult;
    }

    return runVentureSimulator(simulatorInput, activeOverrides);
  }, [simulatorInput, overrides, overridesDirty, venture?.ventureSimulatorResult]);

  function handleOverridesChange(next: VentureSimulatorOverrides) {
    setOverrides(next);
    setOverridesDirty(true);
    if (projectId) saveSimulatorOverrides(projectId, next);
  }

  if (!result) {
    return (
      <EmptyState
        icon="◎"
        title="Simulación pendiente"
        description="Escribe una idea más detallada para simular el venture."
      />
    );
  }

  const defaultHints = {
    monthlyPrice: result.assumptions.revenuePerUserYear1 / 12,
    estimatedCAC: result.assumptions.baseCAC,
    monthlyChurnPercent: result.assumptions.baseChurnMonthly,
    monthlyBurn: result.assumptions.monthlyBurnEstimate,
    estimatedConversion: result.assumptions.baseConversion,
  };

  const persistedNote =
    venture?.ventureSimulatorResult && !overridesDirty && !hasActiveOverrides(overrides);

  return (
    <div className="venture-simulator">
      <header className="sim-header">
        <SectionHeader
          title="Venture Simulator"
          description="Simulación estratégica y económica heurística — no sustituye validación con usuarios reales."
        />
        {persistedNote && (
          <p className="sim-persisted-note">Resultado guardado al aceptar el build pre-construcción.</p>
        )}
        <div className="sim-sources" style={{ display: "flex", flexWrap: "wrap", gap: "var(--fhis-space-2)" }}>
          {result.customAssumptions && (
            <Badge variant="blue">Custom assumptions</Badge>
          )}
          {result.dataSourcesUsed.map((s) => (
            <Badge key={s} variant="default">{s}</Badge>
          ))}
        </div>
      </header>

      <div className="fhis-sim-score-row">
        <SimulatorCard title="Startup Score" value={result.startupScore} />
        <SimulatorCard title="Venture Score" value={result.ventureScore} />
        <Panel>
          <span style={{ fontSize: "var(--fhis-text-xs)", color: "var(--fhis-color-text-muted)", textTransform: "uppercase" }}>Recomendación</span>
          <strong style={{ display: "block", fontSize: "var(--fhis-text-lg)" }}>{result.recommendationLabel}</strong>
          <span style={{ fontSize: "var(--fhis-text-sm)", color: "var(--fhis-color-text-muted)" }}>
            Confianza: {CONFIDENCE_LABELS[result.confidence]}
          </span>
        </Panel>
      </div>

      <Button type="button" variant="ghost" size="sm" onClick={() => setShowOverrides((v) => !v)}>
        {showOverrides ? "Ocultar supuestos" : "Ajustar supuestos económicos"}
      </Button>

      {showOverrides && (
        <SimulatorOverridesForm
          overrides={overrides}
          defaults={defaultHints}
          onChange={handleOverridesChange}
        />
      )}

      <Panel>
        <SectionHeader title="Escenarios (año 1 y 2)" />
        <div className="sim-scenarios-grid">
          {result.scenarios.map((scenario) => (
            <Panel key={scenario.scenario} style={{ padding: "var(--fhis-space-3)" }}>
              <h4>{SCENARIO_LABELS[scenario.scenario]}</h4>
              <dl className="sim-scenario-dl">
                <div><dt>Usuarios A1</dt><dd>{scenario.year1Users.toLocaleString("es-ES")}</dd></div>
                <div><dt>Usuarios A2</dt><dd>{scenario.year2Users.toLocaleString("es-ES")}</dd></div>
                <div><dt>Ingresos A1</dt><dd>{formatCurrency(scenario.year1Revenue)}</dd></div>
                <div><dt>Ingresos A2</dt><dd>{formatCurrency(scenario.year2Revenue)}</dd></div>
                <div><dt>CAC</dt><dd>{formatCurrency(scenario.estimatedCAC)}</dd></div>
                <div><dt>LTV</dt><dd>{formatCurrency(scenario.estimatedLTV)}</dd></div>
                <div><dt>Conversión</dt><dd>{scenario.estimatedConversion}%</dd></div>
                <div><dt>Churn/mes</dt><dd>{scenario.estimatedChurn}%</dd></div>
                <div><dt>Break-even</dt><dd>{scenario.breakEvenMonths ? `${scenario.breakEvenMonths} meses` : "No alcanzado"}</dd></div>
                <div><dt>Adquisición</dt><dd>{scenario.acquisitionComplexity}</dd></div>
              </dl>
              <p className="sim-scenario-risk"><strong>Riesgo principal:</strong> {scenario.primaryRisk}</p>
            </Panel>
          ))}
        </div>
      </Panel>

      <div className="fhis-sim-insights-grid">
        <Panel>
          <SectionHeader title="Riesgos" />
          <ul className="sim-list">
            {result.risks.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <SectionHeader title="Oportunidades" />
          <ul className="sim-list">
            {result.opportunities.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <SectionHeader title="Alternativas recomendadas" />
          <ul className="sim-list">
            {result.recommendedAlternatives.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel>
        <SectionHeader title="Siguiente acción sugerida" />
        <p>{result.suggestedNextAction}</p>
        <p className="sim-assumptions-note">
          Modelo: {result.assumptions.businessModel} · Base usuarios A1: {result.assumptions.baseYear1Users.toLocaleString("es-ES")}
        </p>
      </Panel>
    </div>
  );
}
