"use client";

import { useEffect, useState } from "react";
import {
  runAISkillsLab,
  DOMAIN_LABELS,
  type AISkillsLabSnapshot,
} from "@/lib/lab/ai-skills-lab";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Status } from "@/components/ui/fhis/Status";

function riskVariant(level: string): "default" | "accent" | "amber" | "red" {
  if (level === "CRITICAL" || level === "HIGH") return "red";
  if (level === "MEDIUM") return "amber";
  return "default";
}

export function AISkillsLabView() {
  const [data, setData] = useState<AISkillsLabSnapshot | null>(null);

  useEffect(() => {
    runAISkillsLab().then(setData);
  }, []);

  if (!data) {
    return (
      <Container>
        <p>Cargando AI Capability Skills…</p>
      </Container>
    );
  }

  const reasoningSample = data.sampleExecutions["ai-reasoning"];
  const codingSample = data.sampleExecutions["ai-coding"];
  const ragSample = data.sampleExecutions["ai-rag"];

  return (
    <Container className="fhis-ai-skills-lab">
      <SectionHeader
        title="AI Capability Skills"
        subtitle="RC4.7 — Capabilities not models; all execution via AI Runtime + Governance (sandbox)"
      />

      <Stack gap="lg">
        <Panel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <KpiBlock label="AI Capabilities" value={String(data.health.total)} />
            <KpiBlock label="Healthy" value={String(data.health.healthy)} />
            <KpiBlock label="Sandbox" value={String(data.health.sandbox)} />
            <KpiBlock label="Audit logs" value={String(data.auditLogs.length)} />
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Capabilities" subtitle="13 AI capability domains" />
          <div style={{ display: "grid", gap: 12 }}>
            {data.domains.map((section) => (
              <div
                key={section.skill.id}
                style={{
                  padding: "12px 14px",
                  border: "1px solid var(--fhis-color-border)",
                  borderRadius: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <strong>{DOMAIN_LABELS[section.domain] ?? section.domain}</strong>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Badge variant="default">ai-runtime</Badge>
                    <Badge variant={riskVariant(section.riskSample.level)}>
                      {section.riskSample.level}
                    </Badge>
                    <Badge variant={section.policySample.passed ? "accent" : "red"}>
                      ai_usage {section.policySample.passed ? "OK" : "BLOCK"}
                    </Badge>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                  {section.actions.map((a) => (
                    <Badge key={a.id} variant="accent">
                      {a.name}
                    </Badge>
                  ))}
                </div>
                {section.runtimeRouting && (
                  <p style={{ fontSize: 12, opacity: 0.75, margin: 0 }}>
                    Runtime session: {section.runtimeRouting.runtimeSessionId}
                    {section.runtimeRouting.aiRuntimeProvider && (
                      <> · {section.runtimeRouting.aiRuntimeProvider}/{section.runtimeRouting.aiRuntimeModel}</>
                    )}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Panel>

        {(reasoningSample || codingSample || ragSample) && (
          <Panel>
            <SectionHeader title="Sample Executions" subtitle="Governed via runGovernedSkillRequest" />
            {reasoningSample?.skillResult && (
              <p style={{ fontSize: 13, marginBottom: 8 }}>
                Reasoning: {reasoningSample.skillResult.output.slice(0, 160)}…{" "}
                <Badge variant={riskVariant(reasoningSample.risk.level)}>
                  {reasoningSample.risk.level}
                </Badge>
              </p>
            )}
            {codingSample?.skillResult && (
              <p style={{ fontSize: 13, marginBottom: 8 }}>
                Coding: {codingSample.skillResult.output.slice(0, 160)}…{" "}
                <Badge variant={riskVariant(codingSample.risk.level)}>{codingSample.risk.level}</Badge>
              </p>
            )}
            {ragSample?.skillResult && (
              <p style={{ fontSize: 13 }}>
                RAG: {ragSample.skillResult.output.slice(0, 160)}…{" "}
                <Badge variant={riskVariant(ragSample.risk.level)}>{ragSample.risk.level}</Badge>
              </p>
            )}
          </Panel>
        )}

        <Panel>
          <SectionHeader title="Telemetry" subtitle={`${data.telemetry.length} AI capability records`} />
          <div style={{ fontSize: 12, maxHeight: 140, overflow: "auto" }}>
            {data.telemetry.length === 0 && <p style={{ opacity: 0.7 }}>No telemetry yet.</p>}
            {data.telemetry.slice(0, 8).map((t) => (
              <div key={t.id}>
                {t.skillId} · {t.provider} · {t.latencyMs}ms ·{" "}
                {t.success ? <Status status="success" label="OK" /> : <Status status="warning" label="FAIL" />}
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="History / Audit" subtitle="Governance + skill audit timeline" />
          <div style={{ fontSize: 12, maxHeight: 200, overflow: "auto" }}>
            {data.governanceHistory.length === 0 && data.auditLogs.length === 0 && (
              <p style={{ opacity: 0.7 }}>No history yet.</p>
            )}
            {data.governanceHistory.slice(0, 6).map((h) => (
              <div
                key={h.id}
                style={{
                  padding: "6px 0",
                  borderBottom: "1px solid var(--fhis-color-border)",
                }}
              >
                {h.timestamp.slice(0, 19)} · {h.skillId} · {h.action} ·{" "}
                <Badge variant={riskVariant(h.riskLevel)}>{h.riskLevel}</Badge> ·{" "}
                {h.governancePassed ? "PASS" : "BLOCKED"}
              </div>
            ))}
            {data.auditLogs.slice(0, 4).map((a) => (
              <div
                key={a.id}
                style={{
                  padding: "6px 0",
                  borderBottom: "1px solid var(--fhis-color-border)",
                }}
              >
                {a.timestamp.slice(0, 19)} · audit · {a.skillId} · {a.action} · {a.outcome}
              </div>
            ))}
          </div>
        </Panel>
      </Stack>
    </Container>
  );
}
