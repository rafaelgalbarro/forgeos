"use client";

import { useEffect, useState } from "react";
import {
  runProductivitySkillsLab,
  type ProductivitySkillsLabSnapshot,
} from "@/lib/lab/productivity-skills-lab";
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

const PRIMARY_SECTIONS = ["inbox", "calendar", "files", "documents", "slack", "meetings"];

export function ProductivitySkillsLabView() {
  const [data, setData] = useState<ProductivitySkillsLabSnapshot | null>(null);

  useEffect(() => {
    runProductivitySkillsLab().then(setData);
  }, []);

  if (!data) {
    return (
      <Container>
        <p>Cargando Productivity Skills…</p>
      </Container>
    );
  }

  const primarySections = data.sections.filter((s) => PRIMARY_SECTIONS.includes(s.key));
  const emailSample = data.sampleExecutions["productivity-email"];
  const messagingSample = data.sampleExecutions["productivity-messaging"];

  return (
    <Container className="fhis-productivity-skills-lab">
      <SectionHeader
        title="Productivity Skills"
        subtitle="RC4.3 — Email, Calendar, Files, Docs, Slack & Meetings (sandbox mock)"
      />

      <Stack gap="lg">
        <Panel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <KpiBlock label="Productivity Skills" value={String(data.health.total)} />
            <KpiBlock label="Healthy" value={String(data.health.healthy)} />
            <KpiBlock label="Sandbox" value={String(data.health.sandbox)} />
            <KpiBlock label="Audit logs" value={String(data.auditLogs.length)} />
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Workspaces" subtitle="7 provider modules — mock only" />
          <div style={{ display: "grid", gap: 12 }}>
            {primarySections.map((section) => {
              const sample = data.sampleExecutions[section.skill.id];
              return (
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
                    <strong>{section.label}</strong>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Badge variant="default">{section.skill.provider}</Badge>
                      <Badge variant={riskVariant(section.riskSample.level)}>
                        {section.riskSample.level}
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
                  {sample?.skillResult && (
                    <p style={{ fontSize: 12, opacity: 0.85, margin: 0 }}>
                      {sample.skillResult.output}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>

        {(emailSample || messagingSample) && (
          <Panel>
            <SectionHeader title="Governed Samples" subtitle="Inbox & Slack — runGovernedSkillRequest" />
            {emailSample?.skillResult && (
              <p style={{ fontSize: 13, marginBottom: 8 }}>
                Inbox: {emailSample.skillResult.output}{" "}
                <Badge variant={riskVariant(emailSample.risk.level)}>{emailSample.risk.level}</Badge>
              </p>
            )}
            {messagingSample?.skillResult && (
              <p style={{ fontSize: 13 }}>
                Slack: {messagingSample.skillResult.output}{" "}
                <Badge variant={riskVariant(messagingSample.risk.level)}>
                  {messagingSample.risk.level}
                </Badge>
              </p>
            )}
          </Panel>
        )}

        <Panel>
          <SectionHeader title="Telemetry" subtitle={`${data.telemetry.length} productivity records`} />
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
          <SectionHeader title="History" subtitle="Audit & governance activity timeline" />
          <div style={{ fontSize: 12, maxHeight: 220, overflow: "auto" }}>
            {data.governanceHistory.length === 0 && data.auditLogs.length === 0 && (
              <p style={{ opacity: 0.7 }}>No history yet.</p>
            )}
            {data.governanceHistory.slice(0, 8).map((h) => (
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
            {data.auditLogs.slice(0, 6).map((a) => (
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
