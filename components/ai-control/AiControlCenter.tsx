"use client";

import Link from "next/link";
import type { AiControlPanelSnapshot } from "@/lib/ai-control/types";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { Status } from "@/components/ui/fhis/Status";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";

interface AiControlCenterProps {
  snapshot: AiControlPanelSnapshot;
}

export function AiControlCenter({ snapshot }: AiControlCenterProps) {
  const { activation } = snapshot;

  return (
    <Container className="fhis-ai-control-center">
      <SectionHeader
        title="Centro de Control IA"
        subtitle="Program 3000 Sprint 4 — Activación IA real para Design Partners"
        action={
          <Link href="/lab/ai-runtime" style={{ fontSize: 13, opacity: 0.85 }}>
            Lab AI Runtime →
          </Link>
        }
      />

      <Stack gap="lg">
        {snapshot.mockModeWarning && (
          <Panel>
            <div
              style={{
                padding: "12px 16px",
                borderRadius: 8,
                border: "1px solid var(--fhis-color-warning, #d97706)",
                background: "rgba(217, 119, 6, 0.08)",
              }}
            >
              <strong style={{ display: "block", marginBottom: 4 }}>⚠ Modo simulación</strong>
              <p style={{ margin: 0, fontSize: 14, opacity: 0.9 }}>{snapshot.mockModeWarning}</p>
            </div>
          </Panel>
        )}

        <Panel>
          <SectionHeader title="Estado de activación" subtitle="Solo lectura — variables de entorno del servidor" />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <Badge variant={activation.active ? "accent" : "default"}>
              Modo: {activation.mode === "real" ? "IA REAL" : "SIMULACIÓN"}
            </Badge>
            <Badge variant={activation.flagEnabled ? "accent" : "default"}>
              ENABLE_REAL_AI: {activation.flagEnabled ? "true" : "false"}
            </Badge>
            <Badge variant={activation.designPartner ? "accent" : "default"}>
              Design Partner: {activation.designPartner ? "sí" : "no"}
            </Badge>
            <Badge variant={activation.hasProviderKeys ? "accent" : "default"}>
              API Keys: {activation.hasProviderKeys ? "configuradas" : "ninguna"}
            </Badge>
            <Badge variant={snapshot.streamingEnabled ? "accent" : "default"}>
              Streaming: {snapshot.streamingEnabled ? "activo" : "inactivo"}
            </Badge>
          </div>
          {activation.blockReason && (
            <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>
              Bloqueo: {activation.blockReason}
            </p>
          )}
        </Panel>

        <Panel>
          <SectionHeader title="Telemetría global" subtitle="Coste · Latencia · Fallbacks" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <KpiBlock label="Solicitudes" value={String(snapshot.telemetry.requestCount)} />
            <KpiBlock label="Coste total" value={`$${snapshot.telemetry.totalCost.toFixed(4)}`} />
            <KpiBlock label="Latencia media" value={`${snapshot.telemetry.avgLatencyMs}ms`} />
            <KpiBlock label="Fallbacks" value={String(snapshot.telemetry.fallbacks)} />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 12,
              marginTop: 12,
            }}
          >
            <KpiBlock label="Tokens" value={String(snapshot.telemetry.totalTokens)} />
            <KpiBlock label="Errores" value={String(snapshot.telemetry.errors)} />
            <KpiBlock label="Presupuesto mensual" value={`$${snapshot.monthlyBudgetUsd}`} />
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Proveedores" subtitle="Salud · Modelos · Coste · Latencia · Streaming" />
          <div style={{ display: "grid", gap: 10 }}>
            {snapshot.providers.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(120px, 1fr) 2fr repeat(4, auto)",
                  gap: 12,
                  alignItems: "center",
                  padding: "12px 14px",
                  border: "1px solid var(--fhis-color-border)",
                  borderRadius: 8,
                }}
              >
                <div>
                  <strong>{p.label}</strong>
                  <div style={{ fontSize: 12, opacity: 0.7 }}>{p.id}</div>
                </div>
                <div style={{ fontSize: 13 }}>
                  <div style={{ opacity: 0.85 }}>{p.message ?? "—"}</div>
                  <div style={{ marginTop: 4, opacity: 0.7 }}>
                    Modelos: {p.models.slice(0, 3).join(", ")}
                  </div>
                </div>
                <Badge variant="default">${p.estimatedCostPer1k}/1k</Badge>
                <Badge variant="default">{p.latencyMs}ms</Badge>
                <Status
                  status={p.healthy && p.configured ? "success" : p.configured ? "warning" : "idle"}
                  label={p.configured ? (p.healthy ? "OK" : "WARN") : "OFF"}
                />
                <Badge variant={p.streamingSupported ? "accent" : "default"}>
                  {p.streamingSupported ? "stream" : "no-stream"}
                </Badge>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Cadena de fallback" subtitle="Router v2 — proveedores visibles por tarea" />
          <div style={{ display: "grid", gap: 10 }}>
            {snapshot.fallbackChains.map((chain) => (
              <div
                key={chain.task}
                style={{
                  padding: "12px 14px",
                  border: "1px solid var(--fhis-color-border)",
                  borderRadius: 8,
                }}
              >
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                  <Badge variant="accent">{chain.task}</Badge>
                  <strong>{chain.selectedProvider}</strong>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>{chain.selectedModel}</span>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                  {chain.chain.map((provider, i) => (
                    <Badge key={`${chain.task}-${provider}-${i}`} variant={i === 0 ? "accent" : "default"}>
                      {i > 0 && "→ "}
                      {provider}
                    </Badge>
                  ))}
                </div>
                <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>{chain.rationale}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Eventos de fallback recientes" subtitle="Últimas ejecuciones con fallback" />
          {snapshot.recentFallbackEvents.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, opacity: 0.75 }}>Sin eventos de fallback registrados.</p>
          ) : (
            <div style={{ display: "grid", gap: 6 }}>
              {snapshot.recentFallbackEvents.map((ev) => (
                <div
                  key={ev.id}
                  style={{ fontSize: 13, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}
                >
                  <Badge variant="default">{ev.task}</Badge>
                  <span>{ev.provider}</span>
                  <span style={{ opacity: 0.7 }}>{ev.model}</span>
                  <span style={{ opacity: 0.6 }}>{ev.latencyMs}ms</span>
                  <span style={{ opacity: 0.5, fontSize: 12 }}>{ev.timestamp}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel>
          <SectionHeader title="Configuración del runtime" />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Badge variant={snapshot.multiProviderRouting ? "accent" : "default"}>
              Multi-provider: {snapshot.multiProviderRouting ? "on" : "off"}
            </Badge>
            <Badge variant={snapshot.costOptimizer ? "accent" : "default"}>
              Optimizador coste: {snapshot.costOptimizer ? "on" : "off"}
            </Badge>
            <Badge variant={snapshot.streamingEnabled ? "accent" : "default"}>
              Streaming: {snapshot.streamingEnabled ? "on" : "off"}
            </Badge>
          </div>
        </Panel>
      </Stack>
    </Container>
  );
}
