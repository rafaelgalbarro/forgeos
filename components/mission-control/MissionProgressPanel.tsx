"use client";

import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Progress } from "@/components/ui/fhis/Progress";
import { Badge } from "@/components/ui/fhis/Badge";
import type { Mission, SnapshotItem } from "@/lib/mission-control/types";
import { gtmSnapshotSummary } from "@/lib/mission-control/go-to-market";
import { getExitStrategyLabel } from "@/lib/mission-control/exit-strategy";
import type { ExitStrategyType } from "@/lib/mission-control/exit-strategy";

interface Props {
  mission: Mission;
  onInvestorClick?: () => void;
  exitStrategy?: ExitStrategyType | null;
}

function statusVariant(status: SnapshotItem["status"]): "accent" | "default" | "amber" {
  if (status === "completed") return "accent";
  if (status === "in_progress") return "amber";
  return "default";
}

function statusLabel(status: SnapshotItem["status"]): string {
  const map: Record<SnapshotItem["status"], string> = {
    idle: "Pendiente",
    in_progress: "En curso",
    completed: "Completado",
    blocked: "Bloqueado",
  };
  return map[status];
}

function gtmStatusVariant(status: string): "accent" | "default" | "amber" {
  if (status === "ready") return "accent";
  if (status === "generating") return "amber";
  return "default";
}

export function MissionProgressPanel({ mission, onInvestorClick, exitStrategy }: Props) {
  const gtm = mission.gtmSnapshot;

  return (
    <Panel className="fhis-mc-progress-panel">
      <Stack gap="md">
        <SectionHeader title="Progreso en tiempo real" subtitle="Snapshots de la misión" />
        {exitStrategy && (
          <div style={{ marginBottom: 8, padding: "8px 10px", borderRadius: 8, background: "var(--fhis-color-accent-subtle, #eff6ff)" }}>
            <span style={{ fontSize: "0.75rem", color: "var(--fhis-color-text-muted)" }}>Exit strategy</span>
            <div style={{ fontSize: "0.875rem", fontWeight: 600 }}>🎯 {getExitStrategyLabel(exitStrategy)}</div>
          </div>
        )}
        {mission.snapshots.map((snap) => (
          <div
            key={snap.id}
            style={{ marginBottom: 8, cursor: snap.id === "investorReadiness" ? "pointer" : undefined }}
            onClick={snap.id === "investorReadiness" ? onInvestorClick : undefined}
            role={snap.id === "investorReadiness" ? "button" : undefined}
            tabIndex={snap.id === "investorReadiness" ? 0 : undefined}
            onKeyDown={snap.id === "investorReadiness" ? (e) => e.key === "Enter" && onInvestorClick?.() : undefined}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                {snap.label}
                {snap.id === "investorReadiness" && snap.summary ? ` — ${snap.summary}` : ""}
              </span>
              <Badge variant={statusVariant(snap.status)}>{statusLabel(snap.status)}</Badge>
            </div>
            <Progress value={snap.progress} max={100} />
          </div>
        ))}

        {(gtm || mission.gtmGenerating) && (
          <section style={{ marginTop: 8, paddingTop: 12, borderTop: "1px solid var(--fhis-color-border, #eee)" }}>
            <SectionHeader
              title="Entregables GTM"
              subtitle={mission.gtmGenerating ? "Generando…" : gtmSnapshotSummary(gtm!)}
            />
            {mission.gtmGenerating ? (
              <Progress value={40} max={100} />
            ) : (
              gtm?.deliverables.map((d) => (
                <div key={d.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: "0.8125rem" }}>
                  <span>{d.label}</span>
                  <Badge variant={gtmStatusVariant(d.status)}>
                    {d.status === "ready" ? "Listo" : d.status === "generating" ? "Generando" : "Pendiente"}
                  </Badge>
                </div>
              ))
            )}
          </section>
        )}
      </Stack>
    </Panel>
  );
}
