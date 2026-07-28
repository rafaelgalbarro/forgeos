"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/fhis/Badge";
import { Card } from "@/components/ui/fhis/Card";
import { ExecutiveCard } from "@/components/ui/fhis/ExecutiveCard";
import { Progress } from "@/components/ui/fhis/Progress";
import { Status } from "@/components/ui/fhis/Status";
import { Grid, Stack } from "@/components/ui/fhis/Layout";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { cn } from "@/lib/design-system/cn";
import type { JourneyPhaseState } from "@/lib/founder-journey";

interface JourneyPhaseCardProps {
  phase: JourneyPhaseState;
}

const STATUS_MAP: Record<
  JourneyPhaseState["status"],
  { fhis: "idle" | "active" | "success" | "warning" | "error" | "pending"; label: string }
> = {
  pending: { fhis: "pending", label: "Pendiente" },
  active: { fhis: "active", label: "En curso" },
  complete: { fhis: "success", label: "Completada" },
  blocked: { fhis: "error", label: "Bloqueada" },
};

const BLOCKER_VARIANT: Record<string, "default" | "amber" | "red"> = {
  info: "default",
  warning: "amber",
  critical: "red",
};

export function JourneyPhaseCard({ phase }: JourneyPhaseCardProps) {
  const statusMeta = STATUS_MAP[phase.status];
  const isExecutive = phase.executive === true;

  return (
    <Card variant="elevated" padding="lg">
      <Stack gap="lg">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--fhis-space-3)" }}>
          <div>
            <p style={{ margin: 0, fontSize: "var(--fhis-text-xs)", color: "var(--fhis-color-text-muted)" }}>
              Fase {phase.order} · {phase.estimatedTime}
            </p>
            <h2 style={{ margin: "var(--fhis-space-1) 0 0", fontSize: "var(--fhis-text-xl)" }}>{phase.label}</h2>
          </div>
          <Status status={statusMeta.fhis} label={statusMeta.label} />
        </div>

        <div>
          <p style={{ margin: "0 0 var(--fhis-space-2)", fontSize: "var(--fhis-text-sm)", color: "var(--fhis-color-text-muted)" }}>
            Objetivo
          </p>
          <p style={{ margin: 0, lineHeight: "var(--fhis-leading-relaxed)" }}>{phase.objetivo}</p>
        </div>

        <Progress value={phase.progress} label="Progreso" showValue />

        <Grid cols={2} gap="md">
          <KpiBlock label="Tiempo estimado" value={phase.estimatedTime} />
          <KpiBlock label="Valor generado" value={phase.valueGenerated} />
        </Grid>

        {isExecutive && phase.executiveNote && (
          <ExecutiveCard
            name={phase.id === "ceo-review" ? "AI CEO" : "AI Board"}
            role={phase.id === "ceo-review" ? "Revisión ejecutiva" : "Decisión de gobernanza"}
          >
            <p style={{ margin: 0, fontSize: "var(--fhis-text-sm)", lineHeight: "var(--fhis-leading-relaxed)" }}>
              {phase.executiveNote}
            </p>
          </ExecutiveCard>
        )}

        {phase.blockers.length > 0 && (
          <div>
            <p style={{ margin: "0 0 var(--fhis-space-2)", fontSize: "var(--fhis-text-sm)", fontWeight: "var(--fhis-weight-semibold)" }}>
              Bloqueos
            </p>
            <Stack gap="sm">
              {phase.blockers.map((blocker) => (
                <Badge key={blocker.id} variant={BLOCKER_VARIANT[blocker.severity] ?? "default"}>
                  {blocker.label}
                </Badge>
              ))}
            </Stack>
          </div>
        )}

        {phase.nextAction && (
          <div className="fhis-panel" style={{ padding: "var(--fhis-space-4)" }}>
            <p style={{ margin: "0 0 var(--fhis-space-1)", fontSize: "var(--fhis-text-xs)", color: "var(--fhis-color-text-muted)" }}>
              Siguiente acción
            </p>
            <p style={{ margin: "0 0 var(--fhis-space-2)", fontWeight: "var(--fhis-weight-semibold)" }}>
              {phase.nextAction.label}
            </p>
            <p style={{ margin: "0 0 var(--fhis-space-3)", fontSize: "var(--fhis-text-sm)", color: "var(--fhis-color-text-muted)" }}>
              {phase.nextAction.description}
            </p>
            {phase.nextAction.href && (
              <Link href={phase.nextAction.href} className={cn("fhis-btn", "fhis-btn-primary", "fhis-btn-sm")}>
                Ir a la acción
              </Link>
            )}
          </div>
        )}
      </Stack>
    </Card>
  );
}
