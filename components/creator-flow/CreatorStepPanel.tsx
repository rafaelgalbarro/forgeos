"use client";

import Link from "next/link";
import { ExecutiveCard } from "@/components/ui/fhis/ExecutiveCard";
import { Badge } from "@/components/ui/fhis/Badge";
import { Progress } from "@/components/ui/fhis/Progress";
import { Timeline } from "@/components/ui/fhis/Timeline";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import type { CreatorFlowSnapshot, CreatorStepSnapshot } from "@/lib/creator-flow";

interface CreatorStepPanelProps {
  step: CreatorStepSnapshot;
  snapshot: CreatorFlowSnapshot;
  onAdvance: () => void;
  advancing?: boolean;
}

const STATUS_LABEL: Record<CreatorStepSnapshot["status"], string> = {
  complete: "Completado",
  active: "En curso",
  blocked: "Bloqueado",
  pending: "Pendiente",
};

export function CreatorStepPanel({ step, snapshot, onAdvance, advancing }: CreatorStepPanelProps) {
  const isExecutive = step.id === "ceo" || step.id === "board";
  const timelineItems = snapshot.timelineHighlights.slice(0, 4).map((t) => ({
    title: t.title,
    time: new Date(t.timestamp).toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    }),
    description: t.description,
  }));

  return (
    <Panel>
      <Stack gap="md">
        <div style={{ display: "flex", alignItems: "center", gap: "var(--fhis-space-3)", flexWrap: "wrap" }}>
          <SectionHeader title={step.label} subtitle={step.objetivo} />
          <Badge variant={step.status === "complete" ? "blue" : step.status === "active" ? "accent" : "default"}>
            {STATUS_LABEL[step.status]}
          </Badge>
        </div>

        <Progress value={step.progress} showValue label={`Tiempo estimado: ${step.estimatedTime}`} />

        {isExecutive && step.executiveSummary ? (
          <ExecutiveCard
            name={step.id === "ceo" ? "Director General" : "Board de Gobernanza"}
            role={step.id === "ceo" ? "Revisión ejecutiva" : "Decisión de portfolio"}
          >
            <p style={{ margin: 0, lineHeight: 1.65, whiteSpace: "pre-line", fontSize: "var(--fhis-text-sm)" }}>
              {step.executiveSummary}
            </p>
          </ExecutiveCard>
        ) : null}

        <div>
          <h4 style={{ margin: "0 0 var(--fhis-space-2)", fontSize: "var(--fhis-text-sm)" }}>Qué ha pasado</h4>
          <ul style={{ margin: 0, paddingLeft: "var(--fhis-space-5)", lineHeight: 1.6 }}>
            {step.whatHappened.map((item, i) => (
              <li key={i} style={{ marginBottom: "var(--fhis-space-1)", fontSize: "var(--fhis-text-sm)" }}>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 style={{ margin: "0 0 var(--fhis-space-2)", fontSize: "var(--fhis-text-sm)" }}>Qué hacer ahora</h4>
          <p style={{ margin: 0, lineHeight: 1.6, fontSize: "var(--fhis-text-sm)" }}>{step.whatToDoNext}</p>
        </div>

        {snapshot.knowledgeRefs.length > 0 && (step.id === "research" || step.id === "product") ? (
          <div>
            <h4 style={{ margin: "0 0 var(--fhis-space-2)", fontSize: "var(--fhis-text-sm)" }}>Knowledge</h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--fhis-space-2)" }}>
              {snapshot.knowledgeRefs.slice(0, 5).map((ref) => (
                <Badge key={ref.id} variant="blue">
                  {ref.title}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        <div style={{ display: "flex", gap: "var(--fhis-space-3)", flexWrap: "wrap", alignItems: "center" }}>
          {step.status !== "complete" ? (
            <button
              type="button"
              className="fhis-btn fhis-btn-primary"
              onClick={onAdvance}
              disabled={advancing || step.status === "blocked"}
            >
              {advancing ? "Avanzando…" : step.ctaLabel}
            </button>
          ) : (
            <span style={{ fontSize: "var(--fhis-text-sm)", color: "var(--fhis-color-green)" }}>
              Paso completado
            </span>
          )}
          {step.ctaHref ? (
            <Link href={step.ctaHref} className="fhis-btn fhis-btn-secondary">
              Abrir detalle →
            </Link>
          ) : null}
          <Link
            href={`/venture/${snapshot.summary.ventureId}`}
            className="fhis-btn fhis-btn-ghost fhis-btn-sm"
          >
            Workspace
          </Link>
        </div>

        {timelineItems.length > 0 ? (
          <div>
            <h4 style={{ margin: "0 0 var(--fhis-space-2)", fontSize: "var(--fhis-text-sm)" }}>
              Timeline reciente
            </h4>
            <Timeline items={timelineItems} />
          </div>
        ) : null}
      </Stack>
    </Panel>
  );
}
