"use client";

import { useCallback, useEffect, useState } from "react";
import { Panel, Stack, Grid, SectionHeader, Badge, KpiBlock } from "@/components/ui/fhis";
import { buildSystemHealthSnapshot, buildRuntimeMonitoringSnapshot, buildAiMonitoringSnapshot } from "@/lib/production-readiness";
import type { SystemHealthSnapshot, RuntimeMonitoringSnapshot, AiMonitoringSnapshot } from "@/lib/production-readiness";

export function SystemMonitoringPanel() {
  const [system, setSystem] = useState<SystemHealthSnapshot | null>(null);
  const [runtime, setRuntime] = useState<RuntimeMonitoringSnapshot | null>(null);
  const [ai, setAi] = useState<AiMonitoringSnapshot | null>(null);

  const refresh = useCallback(async () => {
    setSystem(buildSystemHealthSnapshot());
    setRuntime(buildRuntimeMonitoringSnapshot());
    setAi(await buildAiMonitoringSnapshot());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!system) return null;

  return (
    <Stack gap="lg" className="fhis-prod-monitoring">
      <Grid cols={3} gap="md">
        <KpiBlock label="Uptime" value={`${Math.round(system.uptimeMs / 1000)}s`} />
        <KpiBlock label="Memoria" value={`${system.memoryUsageMb} MB`} />
        <KpiBlock label="Node" value={system.nodeVersion} />
      </Grid>

      <Panel>
        <SectionHeader title="Sistema" subtitle={system.platform} />
        <ul className="fhis-prod-list">
          {system.checks.map((c) => (
            <li key={c.id} className="fhis-prod-check-row">
              <Badge variant={c.status === "healthy" ? "accent" : "amber"}>{c.status}</Badge>
              <span>{c.label}</span>
              {c.message && <span className="fhis-prod-muted">{c.message}</span>}
            </li>
          ))}
        </ul>
      </Panel>

      {runtime && (
        <Panel>
          <SectionHeader title="Runtime" subtitle={`Score ${runtime.score}%`} />
          <p className="fhis-prod-text">
            Execution engine: {runtime.executionEngineAvailable ? "disponible" : "stub"}
            {runtime.dependencyNote && <span className="fhis-prod-muted"> — {runtime.dependencyNote}</span>}
          </p>
          <p className="fhis-prod-text">Portfolio: {runtime.portfolioHealthy}/{runtime.portfolioTotal} ventures saludables</p>
        </Panel>
      )}

      {ai && (
        <Panel>
          <SectionHeader title="AI Runtime" subtitle={ai.realAiActive ? "Real AI activo" : "Modo simulación"} />
          <p className="fhis-prod-text">
            Proveedores: {ai.providersHealthy}/{ai.providersTotal} — Presupuesto: ${ai.monthlyBudgetUsd}/mes
          </p>
          <p className="fhis-prod-text">Telemetría: {ai.telemetryRequests} requests</p>
        </Panel>
      )}
    </Stack>
  );
}
