"use client";

import { useEffect, useState } from "react";
import {
  runAnalyticsSkillsLab,
  type AnalyticsSkillsLabSnapshot,
} from "@/lib/lab/analytics-skills-lab";
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

const DOMAIN_LABELS: Record<string, string> = {
  dashboards: "Dashboards",
  reports: "Reports",
  kpis: "KPIs",
  forecast: "Forecast",
  predictions: "Predictions",
  metrics: "Metrics",
};

export function AnalyticsSkillsLabView() {
  const [data, setData] = useState<AnalyticsSkillsLabSnapshot | null>(null);

  useEffect(() => {
    runAnalyticsSkillsLab().then(setData);
  }, []);

  if (!data) {
    return (
      <Container>
        <p>Cargando Analytics Skills…</p>
      </Container>
    );
  }

  const predictionsSample = data.sampleExecutions["analytics-predictions"];
  const reportsSample = data.sampleExecutions["analytics-reports"];
  const dashboardsSample = data.sampleExecutions["analytics-dashboards"];

  return (
    <Container className="fhis-analytics-skills-lab">
      <SectionHeader
        title="Analytics Skills"
        subtitle="RC4.6 — Dashboards, Reports, KPIs, Forecast & more (sandbox mock)"
      />

      <Stack gap="lg">
        <Panel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <KpiBlock label="Analytics Skills" value={String(data.health.total)} />
            <KpiBlock label="Healthy" value={String(data.health.healthy)} />
            <KpiBlock label="Sandbox" value={String(data.health.sandbox)} />
            <KpiBlock label="Audit logs" value={String(data.auditLogs.length)} />
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Domains" subtitle="6 analytics provider modules" />
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
                    <Badge variant="default">{section.skill.provider}</Badge>
                    <Badge variant={riskVariant(section.riskSample.level)}>
                      {section.riskSample.level}
                    </Badge>
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {section.actions.map((a) => (
                    <Badge key={a.id} variant="accent">
                      {a.label}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {(predictionsSample || reportsSample || dashboardsSample) && (
          <Panel>
            <SectionHeader title="Sample Executions" subtitle="Governed via runGovernedSkillRequest" />
            {dashboardsSample?.skillResult && (
              <p style={{ fontSize: 13, marginBottom: 8 }}>
                Dashboards: {dashboardsSample.skillResult.output}{" "}
                <Badge variant={riskVariant(dashboardsSample.risk.level)}>
                  {dashboardsSample.risk.level}
                </Badge>
              </p>
            )}
            {reportsSample?.skillResult && (
              <p style={{ fontSize: 13, marginBottom: 8 }}>
                Reports: {reportsSample.skillResult.output}{" "}
                <Badge variant={riskVariant(reportsSample.risk.level)}>{reportsSample.risk.level}</Badge>
              </p>
            )}
            {predictionsSample?.skillResult && (
              <p style={{ fontSize: 13 }}>
                Predictions: {predictionsSample.skillResult.output}{" "}
                <Badge variant={riskVariant(predictionsSample.risk.level)}>
                  {predictionsSample.risk.level}
                </Badge>
              </p>
            )}
          </Panel>
        )}

        <Panel>
          <SectionHeader title="Telemetry" subtitle={`${data.telemetry.length} analytics records`} />
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
          <SectionHeader title="History / Telemetry" subtitle="Governance + skill audit timeline" />
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
