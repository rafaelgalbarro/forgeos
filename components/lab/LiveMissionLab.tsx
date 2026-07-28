"use client";

import { useCallback, useEffect, useState } from "react";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Button } from "@/components/ui/fhis/Button";
import { Badge } from "@/components/ui/fhis/Badge";
import { Progress } from "@/components/ui/fhis/Progress";
import {
  createNewMission,
  getMissionById,
  saveMission,
  ensureSnapshots,
} from "@/lib/mission-control";
import { ensureLiveMission, emitMissionEvent } from "@/lib/mission-control/live-mission/event-emitter";
import type { LiveMissionSerializableSnapshot, LiveMissionWarning } from "@/lib/live-mission/types";
import {
  useLiveMissionSnapshot,
  retryFailedTask,
  failTaskControlled,
  enqueueDemoTask,
} from "@/lib/live-mission/live-mission-store";
import {
  selectRecentEvents,
  selectFailedTasks,
  selectRunningTasks,
  selectArtifactFeed,
  visibleStateLabel,
  visibleStateBadgeVariant,
  formatEta,
  selectEtaSeconds,
} from "@/lib/live-mission/live-mission-selector";
import { phaseLabelEs } from "@/lib/mission-control/mission-flow";

const NEXORA_IDEA = "NEXORA FIELD — plataforma de gestión de campo para equipos distribuidos";

const DEMO_STEPS = [
  { label: "Research de mercado", dept: "Research" },
  { label: "Generar PRD", dept: "CTO" },
  { label: "Diseñar arquitectura", dept: "CTO" },
  { label: "Build prep", dept: "CEO" },
  { label: "Solicitar aprobación deploy", dept: "CEO" },
];

export function LiveMissionLab() {
  const [missionId, setMissionId] = useState<string | null>(null);
  const snapshot = useLiveMissionSnapshot(missionId ?? undefined, 1500);
  const [step, setStep] = useState(0);

  useEffect(() => {
    let m = getMissionById("nexora-field-demo");
    if (!m) {
      m = createNewMission();
      m = { ...m, id: "nexora-field-demo", title: "NEXORA FIELD", idea: NEXORA_IDEA };
      m = ensureLiveMission(ensureSnapshots(m));
      m = emitMissionEvent(m, "intention_classified", "Misión NEXORA FIELD creada", {
        icon: "🚀",
        department: "CEO",
        phase: "UNDERSTAND",
      });
      saveMission(m);
    }
    setMissionId(m.id);
  }, []);

  const runNextStep = useCallback(() => {
    if (!missionId || step >= DEMO_STEPS.length) return;
    const s = DEMO_STEPS[step];
    enqueueDemoTask(missionId, s.label, s.dept);
    setStep((prev) => prev + 1);
  }, [missionId, step]);

  const handlePause = () => {
    if (!missionId) return;
    const m = getMissionById(missionId);
    if (!m) return;
    const updated = emitMissionEvent(m, "autonomous_paused", "Pausado desde lab", { icon: "⏸️", department: "CEO" });
    saveMission(updated);
  };

  const handleResume = () => {
    if (!missionId) return;
    const m = getMissionById(missionId);
    if (!m) return;
    const updated = emitMissionEvent(m, "autonomous_resumed", "Reanudado desde lab", { icon: "▶️", department: "CEO" });
    saveMission(updated);
  };

  const handleControlledFail = () => {
    if (!missionId || !snapshot) return;
    const running = selectRunningTasks(snapshot)[0];
    if (running) failTaskControlled(missionId, running.id, "Fallo controlado — verificación PROGRAM 5300");
  };

  const handleRetry = () => {
    if (!missionId || !snapshot) return;
    const failed = selectFailedTasks(snapshot)[0];
    if (failed) retryFailedTask(missionId, failed.id);
  };

  if (!snapshot) {
    return <div style={{ padding: 32 }}>Cargando live mission lab…</div>;
  }

  return (
    <div className="fhis-page" style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <Stack gap="lg">
        <header>
          <Badge variant="accent">PROGRAM 5300</Badge>
          <h1 style={{ fontSize: "1.5rem", marginTop: 8 }}>Live Mission Lab</h1>
          <p style={{ color: "var(--fhis-color-text-muted)" }}>
            Verificación NEXORA FIELD — snapshots ligeros, sin engines pesados en cliente.
          </p>
        </header>

        <Panel>
          <Stack gap="md">
            <SectionHeader title="NEXORA FIELD" subtitle={NEXORA_IDEA} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <Badge variant={visibleStateBadgeVariant(snapshot.missionState)}>
                {visibleStateLabel(snapshot.missionState)}
              </Badge>
              <span style={{ fontSize: "0.8125rem" }}>
                Fase: {phaseLabelEs(snapshot.stage)} · ETA {formatEta(selectEtaSeconds(snapshot))}
              </span>
            </div>
            <Progress value={snapshot.progress} max={100} />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button variant="primary" onClick={runNextStep} disabled={step >= DEMO_STEPS.length}>
                Paso {step + 1}/{DEMO_STEPS.length}
              </Button>
              <Button variant="secondary" onClick={handlePause}>Pausar</Button>
              <Button variant="secondary" onClick={handleResume}>Reanudar</Button>
              <Button variant="ghost" onClick={handleControlledFail}>Fallo controlado</Button>
              <Button variant="ghost" onClick={handleRetry}>Reintentar</Button>
            </div>
          </Stack>
        </Panel>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <SnapshotPanel title="Queue" items={[...snapshot.runningTasks, ...snapshot.queuedTasks].map((t) => `${t.label} [${t.state}]`)} />
          <SnapshotPanel title="Artifacts" items={selectArtifactFeed(snapshot).map((a) => a.label)} />
          <SnapshotPanel title="Events" items={selectRecentEvents(snapshot, 8).map((e) => `${e.type}: ${e.label}`)} />
          <SnapshotPanel title="Warnings" items={snapshot.errorsAndWarnings.map((w: LiveMissionWarning) => w.message)} />
        </div>

        <pre
          style={{
            fontSize: "0.7rem",
            background: "var(--fhis-color-surface)",
            padding: 12,
            borderRadius: 8,
            overflow: "auto",
            maxHeight: 300,
          }}
        >
          {JSON.stringify(snapshot, null, 2)}
        </pre>
      </Stack>
    </div>
  );
}

function SnapshotPanel({ title, items }: { title: string; items: string[] }) {
  return (
    <Panel>
      <SectionHeader title={title} />
      <ul style={{ margin: 0, padding: "0 0 0 16px", fontSize: "0.8125rem" }}>
        {items.length === 0 ? <li style={{ listStyle: "none", marginLeft: -16, color: "var(--fhis-color-text-muted)" }}>Vacío</li> : items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </Panel>
  );
}
