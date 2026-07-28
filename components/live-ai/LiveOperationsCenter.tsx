"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { Status } from "@/components/ui/fhis/Status";
import {
  LiveAiSimulationEngine,
  buildLiveAiRuntimeSnapshot,
  buildLiveAiSnapshot,
  createInitialSimulationState,
  type LiveAiSimulationState,
} from "@/lib/live-ai";
import { LiveInputBar } from "./LiveInputBar";
import { LiveTimeline } from "./LiveTimeline";
import { LiveAiPanels } from "./panels";

interface Props {
  showLabLink?: boolean;
}

export function LiveOperationsCenter({ showLabLink = false }: Props) {
  const engineRef = useRef<LiveAiSimulationEngine | null>(null);
  const [state, setState] = useState<LiveAiSimulationState>(createInitialSimulationState);
  const runtime = useMemo(() => buildLiveAiRuntimeSnapshot(), []);
  const rc6 = useMemo(() => buildLiveAiSnapshot(), []);

  useEffect(() => {
    const engine = new LiveAiSimulationEngine();
    engine.onUpdate((_event, next) => setState({ ...next }));
    engineRef.current = engine;
    return () => {
      engine.cancel();
    };
  }, []);

  const running = state.status === "running";

  const handleSubmit = useCallback(async (command: string) => {
    const engine = engineRef.current;
    if (!engine) return;
    await engine.run(command);
  }, []);

  const handleCancel = useCallback(() => {
    engineRef.current?.cancel();
  }, []);

  return (
    <Container className="fhis-live-ops-center">
      <Stack gap="lg">
        <header className="fhis-live-ops-header">
          <div className="fhis-live-ops-badges">
            <Badge variant="accent">RC6</Badge>
            <Badge variant={rc6.realAiEnabled ? "accent" : "default"}>
              Real AI: {rc6.realAiEnabled ? "ON" : "OFF"}
            </Badge>
            <Badge variant="default">Live AI Operations Center</Badge>
            <Status
              status={running ? "active" : state.status === "completed" ? "success" : "pending"}
              label={state.status}
            />
          </div>
          <SectionHeader
            title="Centro de Operaciones IA"
            subtitle={
              rc6.realAiEnabled
                ? "Telemetría real — CEO, departamentos, modelos, coste, latencia"
                : "Visualización en tiempo real del pipeline ForgeOS — simulación dry-run"
            }
          />
          {showLabLink && (
            <Link href="/lab/live-ai" className="fhis-btn fhis-btn-ghost fhis-btn-sm">
              Lab harness →
            </Link>
          )}
        </header>

        <Panel>
          <LiveInputBar onSubmit={handleSubmit} onCancel={handleCancel} running={running} />
        </Panel>

        {state.resultSummary && (
          <Panel>
            <Status status="success" label="Resultado CEO" />
            <p style={{ margin: "8px 0 0", fontSize: 14 }}>{state.resultSummary}</p>
          </Panel>
        )}

        {rc6.realAiEnabled && (
          <Panel>
            <SectionHeader title="RC6 Telemetry" subtitle="Provider · Modelo · Coste · Confianza" />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
              <span>Requests: {rc6.telemetry.requestCount}</span>
              <span>Coste: ${rc6.telemetry.totalCost.toFixed(4)}</span>
              <span>Tokens: {rc6.telemetry.totalTokens}</span>
              <span>Latencia: {rc6.telemetry.avgLatencyMs}ms</span>
            </div>
          </Panel>
        )}

        <LiveAiPanels
          panels={state.panels}
          runtime={runtime}
          ventureName={state.context?.ventureName ?? null}
        />

        <Panel>
          <LiveTimeline
            events={state.timeline}
            currentStageId={state.currentStageId}
            running={running}
          />
        </Panel>
      </Stack>
    </Container>
  );
}
