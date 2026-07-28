"use client";

import Link from "next/link";
import type { Mission, MissionSessionStatus } from "@/lib/mission-control/types";
import { phaseLabelEs } from "@/lib/mission-control/mission-flow";

interface Props {
  mission: Mission;
  sessionStatus?: MissionSessionStatus;
  onPause: () => void;
  onResume: () => void;
  onAutoContinue: () => void;
  onViewDecisions: () => void;
  onViewArtifacts: () => void;
  ventureSlug?: string;
  autoContinueEnabled?: boolean;
}

export function MissionControlToolbar({
  mission,
  sessionStatus,
  onPause,
  onResume,
  onAutoContinue,
  onViewDecisions,
  onViewArtifacts,
  ventureSlug,
  autoContinueEnabled = true,
}: Props) {
  const isPaused = sessionStatus === "PAUSED" || mission.autoPilot.pausedForDecision;
  const pendingCount = mission.pendingDecisions.filter((d) => !d.resolved).length;
  const artifactCount = mission.snapshots.filter((s) => s.status === "completed").length;

  return (
    <div
      className="fhis-mc-toolbar"
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        padding: "8px 16px",
        borderBottom: "1px solid var(--mc-border, var(--fhis-color-border))",
        background: "var(--mc-surface-elevated, var(--fhis-color-bg-subtle))",
        alignItems: "center",
        color: "var(--mc-text-primary, var(--fhis-color-text))",
      }}
    >
      <Badge label={phaseLabelEs(mission.phase)} />
      {sessionStatus && <Badge label={sessionStatus} muted />}

      {isPaused ? (
        <ToolbarButton onClick={onResume} label="▶ Reanudar" />
      ) : (
        <ToolbarButton onClick={onPause} label="⏸ Pausar" />
      )}

      <ToolbarButton
        onClick={onAutoContinue}
        label={autoContinueEnabled ? "⚡ Auto-continuar ON" : "⚡ Auto-continuar OFF"}
        active={autoContinueEnabled}
      />

      <ToolbarButton onClick={onViewDecisions} label={`📋 Decisiones (${pendingCount})`} />
      <ToolbarButton onClick={onViewArtifacts} label={`📦 Artefactos (${artifactCount})`} />

      {ventureSlug && (
        <Link
          href={`/ventures/${ventureSlug}`}
          style={{
            fontSize: "0.8rem",
            padding: "4px 10px",
            borderRadius: 6,
            border: "1px solid var(--fhis-color-border)",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          🏢 Abrir venture
        </Link>
      )}

      <Link
        href={`/studio/${mission.id}`}
        style={{
          fontSize: "0.8rem",
          padding: "4px 10px",
          borderRadius: 6,
          border: "1px solid var(--fhis-color-accent, #2563eb)",
          textDecoration: "none",
          color: "var(--fhis-color-accent, #2563eb)",
          fontWeight: 500,
        }}
      >
        🎨 Output Studio
      </Link>

      <Link
        href={`/missions/${mission.id}`}
        style={{ fontSize: "0.75rem", color: "var(--fhis-color-text-muted)", marginLeft: "auto" }}
      >
        /missions/{mission.id}
      </Link>
    </div>
  );
}

function ToolbarButton({
  onClick,
  label,
  active,
}: {
  onClick: () => void;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontSize: "0.8rem",
        padding: "4px 10px",
        borderRadius: 6,
        border: "1px solid var(--mc-border, var(--fhis-color-border))",
        background: active ? "var(--fhis-color-accent-subtle)" : "transparent",
        color: "var(--mc-text-primary, var(--fhis-color-text))",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function Badge({ label, muted }: { label: string; muted?: boolean }) {
  return (
    <span
      style={{
        fontSize: "0.75rem",
        padding: "2px 8px",
        borderRadius: 4,
        background: muted ? "var(--mc-surface, var(--fhis-color-bg))" : "var(--fhis-color-accent-subtle)",
        color: muted ? "var(--mc-text-muted, var(--fhis-color-text-muted))" : "var(--mc-accent, var(--fhis-color-accent))",
      }}
    >
      {label}
    </span>
  );
}
