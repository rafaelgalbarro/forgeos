"use client";

import { useEffect, useState } from "react";
import {
  runCapabilitiesLab,
  type CapabilitiesLabSnapshot,
} from "@/lib/lab/capabilities-lab";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Status } from "@/components/ui/fhis/Status";

export function CapabilitiesLabView() {
  const [data, setData] = useState<CapabilitiesLabSnapshot | null>(null);

  useEffect(() => {
    runCapabilitiesLab().then(setData);
  }, []);

  if (!data) {
    return (
      <Container>
        <p>Cargando Capability Layer…</p>
      </Container>
    );
  }

  return (
    <Container className="fhis-capabilities-lab">
      <SectionHeader
        title="Forge Capability Layer"
        subtitle="RC4.9 — Departments request CAPABILITIES, never Skills directly"
      />

      <Stack gap="lg">
        <Panel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
            <KpiBlock label="Capabilities" value={String(data.health.total)} />
            <KpiBlock label="Healthy" value={String(data.health.healthy)} />
            <KpiBlock label="Categories" value={String(Object.keys(data.categories).length)} />
            <KpiBlock label="Audit logs" value={String(data.auditLogs.length)} />
            <KpiBlock label="Events" value={String(data.events.length)} />
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Capability Registry" subtitle="Por categoría" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {Object.entries(data.categories).map(([cat, count]) => (
              <Badge key={cat} variant="default">
                {cat}: {count}
              </Badge>
            ))}
          </div>
          <div style={{ display: "grid", gap: 6, maxHeight: 240, overflow: "auto" }}>
            {data.registry.slice(0, 24).map((c) => (
              <div
                key={c.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "160px 1fr auto auto",
                  gap: 8,
                  fontSize: 12,
                  padding: "8px 10px",
                  borderBottom: "1px solid var(--fhis-color-border)",
                }}
              >
                <strong>{c.name}</strong>
                <span style={{ opacity: 0.8 }}>{c.description.slice(0, 60)}…</span>
                <Badge variant="default">{c.category}</Badge>
                <Status status={c.health === "healthy" ? "success" : "warning"} label={c.risk} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Resolver Output" subtitle="deploy_software — auto-resolve" />
          <div style={{ fontSize: 12, lineHeight: 1.6 }}>
            <div><strong>Primary skill:</strong> {data.sampleResolver.primarySkillId}</div>
            <div><strong>Provider:</strong> {data.sampleResolver.provider}</div>
            <div><strong>Policy:</strong> {data.sampleResolver.policy.id}</div>
            <div><strong>Approval:</strong> {data.sampleResolver.approval.approved ? "granted" : "pending"}</div>
            <div><strong>Fallbacks:</strong> {data.sampleResolver.fallbackSkillIds.join(", ")}</div>
            <div><strong>Sandbox:</strong> {data.sampleResolver.sandboxMode ? "yes" : "no"}</div>
            <p style={{ opacity: 0.75, marginTop: 8 }}>{data.sampleResolver.rationale}</p>
          </div>
        </Panel>

        <Panel>
          <SectionHeader
            title="Execution Plan"
            subtitle={`${data.samplePlan.steps.length} steps — ${data.samplePlan.capabilityId}`}
          />
          <div style={{ fontSize: 12, maxHeight: 160, overflow: "auto" }}>
            {data.samplePlan.steps.map((s) => (
              <div key={s.stepId} style={{ marginBottom: 4 }}>
                {s.order + 1}. <strong>{s.skillId}</strong> → {s.action}
                {s.dependsOn.length > 0 && (
                  <span style={{ opacity: 0.6 }}> (deps: {s.dependsOn.join(", ")})</span>
                )}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8, fontSize: 11, opacity: 0.7 }}>
            Rollback: {data.samplePlan.rollback.slice(0, 2).join(" · ")}
          </div>
        </Panel>

        {data.sampleExecution && (
          <Panel>
            <SectionHeader title="Sample Execution" subtitle="deploy_software — sandbox" />
            <p style={{ fontSize: 13 }}>{data.sampleExecution.output}</p>
            <p style={{ fontSize: 12, opacity: 0.7 }}>
              Skills: {data.sampleExecution.skillResults.map((s) => s.skillId).join(", ")}
            </p>
            <p style={{ fontSize: 12, opacity: 0.7 }}>
              Runtime: {data.sampleExecution.runtimeSessionId} · {data.sampleExecution.latencyMs}ms
            </p>
          </Panel>
        )}

        <Panel>
          <SectionHeader title="Telemetry & Metrics" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 12 }}>
            <div>
              <strong>Telemetry ({data.telemetry.length})</strong>
              {data.telemetry.slice(0, 4).map((t) => (
                <div key={t.id}>
                  {t.capabilityId} · {t.provider} · {t.latencyMs}ms
                </div>
              ))}
            </div>
            <div>
              <strong>Metrics ({data.metrics.length})</strong>
              {data.metrics.slice(0, 4).map((m) => (
                <div key={m.capabilityId}>
                  {m.capabilityId}: {(m.successRate * 100).toFixed(0)}% · {m.totalCalls} calls
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </Stack>
    </Container>
  );
}
