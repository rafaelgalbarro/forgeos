"use client";

import { useMemo } from "react";
import Link from "next/link";
import { buildAiRuntimeLabSnapshot } from "@/lib/lab/ai-runtime-lab";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { Status } from "@/components/ui/fhis/Status";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";

export function AiRuntimeLab() {
  const snapshot = useMemo(() => buildAiRuntimeLabSnapshot(), []);

  return (
    <Container className="fhis-ai-runtime-lab">
      <SectionHeader
        title="AI Operating System"
        subtitle="RC6 — Real AI Execution Platform"
        action={
          <Link href="/ai" style={{ fontSize: 13, opacity: 0.85 }}>
            Centro de Control IA →
          </Link>
        }
      />

      <Stack gap="lg">
        <Panel>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            <Badge variant={snapshot.realAiEnabled ? "accent" : "default"}>
              IA activa: {snapshot.realAiEnabled ? "true" : "false"}
            </Badge>
            <Badge variant={snapshot.activation.flagEnabled ? "accent" : "default"}>
              ENABLE_REAL_AI: {snapshot.activation.flagEnabled ? "true" : "false"}
            </Badge>
            {snapshot.pipeline.map((step, i) => (
              <Badge key={step} variant={i === snapshot.pipeline.length - 1 ? "accent" : "default"}>
                {i > 0 && "→ "}
                {step}
              </Badge>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
            <KpiBlock label="Providers" value={String(snapshot.providers.length)} />
            <KpiBlock label="Configured" value={String(snapshot.configuredCount)} />
            <KpiBlock label="Models" value={String(snapshot.modelRegistry.totalCount)} />
            <KpiBlock label="Requests" value={String(snapshot.telemetry.requestCount)} />
            <KpiBlock label="Fallbacks" value={String(snapshot.telemetry.fallbacks)} />
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Provider Adapters" subtitle="Todos desacoplados — usuario nunca elige modelo" />
          <div style={{ display: "grid", gap: 8 }}>
            {snapshot.providers.map((p) => (
              <div
                key={p.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr auto auto",
                  gap: 12,
                  alignItems: "center",
                  padding: "10px 12px",
                  border: "1px solid var(--fhis-color-border)",
                  borderRadius: 8,
                }}
              >
                <strong>{p.label}</strong>
                <span style={{ fontSize: 13, opacity: 0.8 }}>{p.specialty}</span>
                <Badge variant="default">{p.status}</Badge>
                <Status status={p.configured ? "success" : "warning"} label={p.configured ? "ON" : "OFF"} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Model Registry" subtitle={`${snapshot.modelRegistry.healthyCount} healthy / ${snapshot.modelRegistry.totalCount} total`} />
          <div style={{ display: "grid", gap: 6 }}>
            {snapshot.modelRegistry.models.slice(0, 8).map((m) => (
              <div key={m.id} style={{ fontSize: 13, display: "flex", gap: 8 }}>
                <Badge variant="default">{m.provider}</Badge>
                <span>{m.label}</span>
                <span style={{ opacity: 0.6 }}>{m.contextWindow.toLocaleString()} ctx</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Model Router v2" subtitle="Fallback · Cost/Latency/Quality · Budget" />
          <div style={{ display: "grid", gap: 8 }}>
            {snapshot.routingSamples.map((r) => (
              <div
                key={r.task}
                style={{
                  padding: "12px 14px",
                  border: "1px solid var(--fhis-color-border)",
                  borderRadius: 8,
                }}
              >
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <Badge variant="accent">{r.task}</Badge>
                  <strong>{r.selectedProvider}</strong>
                  <span style={{ fontSize: 12, opacity: 0.7 }}>{r.selectedModel}</span>
                </div>
                <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>{r.rationale}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Telemetry" subtitle="Tokens · Coste · Latencia · Fallbacks" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 12 }}>
            <KpiBlock label="Total cost" value={`$${snapshot.telemetry.totalCost.toFixed(4)}`} />
            <KpiBlock label="Tokens" value={String(snapshot.telemetry.totalTokens)} />
            <KpiBlock label="Errors" value={String(snapshot.telemetry.errors)} />
            <KpiBlock label="Avg latency" value={`${snapshot.telemetry.avgLatencyMs}ms`} />
          </div>
          <p style={{ fontSize: 13, opacity: 0.85, margin: 0 }}>
            Prompt Compiler v2 · Context Engine v2 · Streaming {snapshot.streaming ? "enabled" : "disabled"}.
            Cada llamada vía <code>runAIRuntime</code> registra telemetría extendida cuando IA real está activa.
          </p>
        </Panel>
      </Stack>
    </Container>
  );
}
