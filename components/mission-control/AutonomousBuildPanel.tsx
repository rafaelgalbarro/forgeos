"use client";

import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { Progress } from "@/components/ui/fhis/Progress";
import type { AutonomousPanelView } from "@/lib/mission-control/autonomous-build/types";
import { approvalReasonLabel } from "@/lib/mission-control/autonomous-build/approval-gates";

interface Props {
  view: AutonomousPanelView;
  pendingApprovalReason?: string;
  onPause?: () => void;
  onResume?: () => void;
}

function formatEta(seconds: number): string {
  if (seconds <= 0) return "—";
  if (seconds < 60) return `~${seconds}s`;
  const m = Math.ceil(seconds / 60);
  return `~${m} min`;
}

function statusLabel(status: AutonomousPanelView["status"]): string {
  const map: Record<AutonomousPanelView["status"], string> = {
    idle: "Inactivo",
    running: "En ejecución",
    paused: "Pausado",
    awaiting_approval: "Esperando aprobación",
    completed: "Completado",
  };
  return map[status];
}

export function AutonomousBuildPanel({ view, pendingApprovalReason, onPause, onResume }: Props) {
  const progress =
    view.completedTasks.length + (view.currentTask ? 1 : 0) > 0
      ? Math.round(
          (view.completedTasks.length /
            (view.completedTasks.length +
              (view.currentTask ? 1 : 0) +
              (view.nextTask ? 1 : 0))) *
            100
        )
      : 0;

  return (
    <Panel className="fhis-mc-autonomous-panel">
      <Stack gap="md">
        <SectionHeader title="Build Autónomo" subtitle="Ejecución sin interrupciones" />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Badge variant={view.status === "running" ? "accent" : "default"}>{statusLabel(view.status)}</Badge>
          <span style={{ fontSize: "0.75rem", color: "var(--fhis-color-text-muted)" }}>
            ETA: {formatEta(view.etaSeconds)}
          </span>
        </div>

        {pendingApprovalReason && (
          <div
            style={{
              padding: 8,
              borderRadius: 6,
              background: "var(--fhis-color-amber-muted, #fef3c7)",
              fontSize: "0.8125rem",
            }}
          >
            ⏸ Aprobación requerida: {approvalReasonLabel(pendingApprovalReason as import("@/lib/mission-control/autonomous-build/types").ApprovalReason)}
          </div>
        )}

        <div>
          <SectionHeader title="Tarea actual" />
          {view.currentTask ? (
            <div style={{ fontSize: "0.875rem" }}>
              <strong>{view.currentTask.label}</strong>
              <div style={{ marginTop: 4 }}>
                <Progress value={view.currentTask.progress} max={100} />
                <span style={{ fontSize: "0.75rem", color: "var(--fhis-color-text-muted)" }}>
                  {view.currentTask.progress}% — {view.currentTask.status}
                </span>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: "0.8125rem", color: "var(--fhis-color-text-muted)" }}>Sin tarea activa</p>
          )}
        </div>

        <div>
          <SectionHeader title="Completadas" />
          {view.completedTasks.length === 0 ? (
            <p style={{ fontSize: "0.8125rem", color: "var(--fhis-color-text-muted)" }}>Ninguna aún</p>
          ) : (
            <ul style={{ margin: 0, padding: 0, listStyle: "none", fontSize: "0.8125rem" }}>
              {view.completedTasks.slice(0, 6).map((t) => (
                <li key={t.id} style={{ padding: "3px 0" }}>
                  ✅ {t.label}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <SectionHeader title="Siguiente" />
          {view.nextTask ? (
            <p style={{ fontSize: "0.8125rem", margin: 0 }}>→ {view.nextTask.label}</p>
          ) : (
            <p style={{ fontSize: "0.8125rem", color: "var(--fhis-color-text-muted)", margin: 0 }}>
              Cola vacía
            </p>
          )}
        </div>

        <Progress value={progress} max={100} />

        <div style={{ display: "flex", gap: 8 }}>
          {view.status === "running" && onPause && (
            <button
              type="button"
              onClick={onPause}
              style={{
                fontSize: "0.75rem",
                padding: "6px 12px",
                borderRadius: 4,
                border: "1px solid var(--fhis-color-border)",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              Pausar
            </button>
          )}
          {(view.status === "paused" || view.status === "awaiting_approval") && onResume && (
            <button
              type="button"
              onClick={onResume}
              style={{
                fontSize: "0.75rem",
                padding: "6px 12px",
                borderRadius: 4,
                border: "1px solid var(--fhis-color-accent)",
                background: "var(--fhis-color-accent-muted, #e0e7ff)",
                cursor: "pointer",
              }}
            >
              Reanudar
            </button>
          )}
        </div>
      </Stack>
    </Panel>
  );
}
