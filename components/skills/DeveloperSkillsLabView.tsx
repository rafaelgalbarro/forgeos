"use client";

import { useEffect, useState } from "react";
import {
  runDeveloperSkillsLab,
  type DeveloperSkillsLabSnapshot,
} from "@/lib/lab/developer-skills-lab";
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

export function DeveloperSkillsLabView() {
  const [data, setData] = useState<DeveloperSkillsLabSnapshot | null>(null);

  useEffect(() => {
    runDeveloperSkillsLab().then(setData);
  }, []);

  if (!data) {
    return (
      <Container>
        <p>Cargando Developer & Cloud Skills…</p>
      </Container>
    );
  }

  const githubSample = data.sampleExecutions.github;
  const vercelSample = data.sampleExecutions.vercel;
  const awsSample = data.sampleExecutions.aws;

  return (
    <Container className="fhis-developer-skills-lab">
      <SectionHeader
        title="Developer & Cloud Skills"
        subtitle="RC4.2 — GitHub, GitLab, Docker, Vercel, Cloudflare, Supabase, AWS, Azure, GCP (sandbox)"
      />

      <Stack gap="lg">
        <Panel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            <KpiBlock label="Providers" value={String(data.health.total)} />
            <KpiBlock label="Healthy" value={String(data.health.healthy)} />
            <KpiBlock label="Sandbox" value={String(data.health.sandbox)} />
            <KpiBlock label="Audit logs" value={String(data.auditLogs.length)} />
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Providers" subtitle="9 RC4.2 provider modules" />
          <div style={{ display: "grid", gap: 12 }}>
            {data.providers.map((section) => (
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
                  <strong>{section.skill.name}</strong>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Badge variant="default">{section.kind}</Badge>
                    <Badge variant="default">{section.skill.provider}</Badge>
                    <Badge variant={riskVariant(section.riskSample.level)}>
                      {section.riskSample.level}
                    </Badge>
                    <Status
                      status={section.skill.health === "healthy" ? "success" : "warning"}
                      label={section.skill.health}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {section.actions.map((a) => (
                    <Badge key={a.id} variant="accent">
                      {a.name}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Projects & Repositories" subtitle="Developer workspace (mock)" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <h4 style={{ fontSize: 13, marginBottom: 8 }}>Projects</h4>
              {data.projects.map((p) => (
                <div key={p.id} style={{ fontSize: 12, padding: "6px 0" }}>
                  {p.name} · {p.provider} · <Badge variant="default">{p.status}</Badge>
                </div>
              ))}
            </div>
            <div>
              <h4 style={{ fontSize: 13, marginBottom: 8 }}>Repositories</h4>
              {data.repositories.map((r) => (
                <div key={r.id} style={{ fontSize: 12, padding: "6px 0" }}>
                  {r.name} · {r.defaultBranch} · {r.visibility}
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Deployments & Containers" subtitle="CI/CD sandbox state" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <h4 style={{ fontSize: 13, marginBottom: 8 }}>Deployments</h4>
              {data.deployments.map((d) => (
                <div key={d.id} style={{ fontSize: 12, padding: "6px 0" }}>
                  {d.provider} · {d.environment} ·{" "}
                  <Badge variant={d.status === "success" ? "default" : "amber"}>{d.status}</Badge>
                  {d.url && <span style={{ opacity: 0.7 }}> · {d.url}</span>}
                </div>
              ))}
            </div>
            <div>
              <h4 style={{ fontSize: 13, marginBottom: 8 }}>Containers</h4>
              {data.containers.map((c) => (
                <div key={c.id} style={{ fontSize: 12, padding: "6px 0" }}>
                  {c.name} · {c.image} · <Badge variant="accent">{c.status}</Badge>
                </div>
              ))}
            </div>
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Cloud Resources" subtitle="Multi-cloud sandbox inventory" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>
              <h4 style={{ fontSize: 13, marginBottom: 8 }}>Resources</h4>
              {data.cloudResources.map((r) => (
                <div key={r.id} style={{ fontSize: 12, padding: "6px 0" }}>
                  {r.name} · {r.provider} · {r.type} · {r.region}
                </div>
              ))}
            </div>
            <div>
              <h4 style={{ fontSize: 13, marginBottom: 8 }}>Cloud Deployments</h4>
              {data.cloudDeployments.map((d) => (
                <div key={d.id} style={{ fontSize: 12, padding: "6px 0" }}>
                  {d.provider} · {d.service} · {d.environment} · {d.status}
                </div>
              ))}
            </div>
          </div>
        </Panel>

        {(githubSample || vercelSample || awsSample) && (
          <Panel>
            <SectionHeader title="Sample Executions" subtitle="Governed sandbox mock runs" />
            {githubSample?.skillResult && (
              <p style={{ fontSize: 13, marginBottom: 8 }}>
                GitHub: {githubSample.skillResult.output}{" "}
                <Badge variant={riskVariant(githubSample.risk.level)}>
                  {githubSample.risk.level}
                </Badge>
              </p>
            )}
            {vercelSample?.skillResult && (
              <p style={{ fontSize: 13, marginBottom: 8 }}>
                Vercel: {vercelSample.skillResult.output}{" "}
                <Badge variant={riskVariant(vercelSample.risk.level)}>
                  {vercelSample.risk.level}
                </Badge>
              </p>
            )}
            {awsSample?.skillResult && (
              <p style={{ fontSize: 13 }}>
                AWS: {awsSample.skillResult.output}{" "}
                <Badge variant={riskVariant(awsSample.risk.level)}>{awsSample.risk.level}</Badge>
              </p>
            )}
          </Panel>
        )}

        <Panel>
          <SectionHeader title="Telemetry" subtitle={`${data.telemetry.length} records`} />
          <div style={{ fontSize: 12, maxHeight: 120, overflow: "auto" }}>
            {data.telemetry.slice(0, 8).map((t) => (
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
