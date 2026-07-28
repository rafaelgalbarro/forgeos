"use client";

import { useEffect, useState } from "react";
import { runSkillsLab, type SkillsLabSnapshot } from "@/lib/lab/skills-lab";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Status } from "@/components/ui/fhis/Status";

export function SkillsLabView() {
  const [data, setData] = useState<SkillsLabSnapshot | null>(null);

  useEffect(() => {
    runSkillsLab().then(setData);
  }, []);

  if (!data) {
    return (
      <Container>
        <p>Cargando Skills Framework…</p>
      </Container>
    );
  }

  return (
    <Container className="fhis-skills-lab">
      <SectionHeader
        title="Skills Framework"
        subtitle="RC4 — Toda acción vía Skills, gobernada por Runtime (sandbox)"
      />

      <Stack gap="lg">
        <Panel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <KpiBlock label="Skills" value={String(data.health.total)} />
            <KpiBlock label="Healthy" value={String(data.health.healthy)} />
            <KpiBlock label="Categories" value={String(Object.keys(data.categories).length)} />
            <KpiBlock label="Audit logs" value={String(data.auditLogs.length)} />
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Registry" subtitle="Por categoría" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
            {Object.entries(data.categories).map(([cat, count]) => (
              <Badge key={cat} variant="default">
                {cat}: {count}
              </Badge>
            ))}
          </div>
          <div style={{ display: "grid", gap: 6, maxHeight: 280, overflow: "auto" }}>
            {data.registry.slice(0, 20).map((s) => (
              <div
                key={s.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr auto auto",
                  gap: 8,
                  fontSize: 12,
                  padding: "8px 10px",
                  borderBottom: "1px solid var(--fhis-color-border)",
                }}
              >
                <strong>{s.name}</strong>
                <span style={{ opacity: 0.8 }}>{s.capability}</span>
                <Badge variant="default">{s.category}</Badge>
                <Status status={s.health === "healthy" ? "success" : "warning"} label={s.health} />
              </div>
            ))}
          </div>
        </Panel>

        {data.sampleExecution && (
          <Panel>
            <SectionHeader title="Sample Execution" subtitle="GitHub — sandbox mock" />
            <p style={{ fontSize: 13 }}>{data.sampleExecution.output}</p>
            <p style={{ fontSize: 12, opacity: 0.7 }}>
              Runtime session: {data.sampleExecution.runtimeSessionId}
            </p>
          </Panel>
        )}

        <Panel>
          <SectionHeader title="Telemetry" subtitle={`${data.telemetry.length} records`} />
          <div style={{ fontSize: 12, maxHeight: 120, overflow: "auto" }}>
            {data.telemetry.slice(0, 5).map((t) => (
              <div key={t.id}>
                {t.skillId} · {t.provider} · {t.latencyMs}ms · {t.success ? "OK" : "FAIL"}
              </div>
            ))}
          </div>
        </Panel>
      </Stack>
    </Container>
  );
}
