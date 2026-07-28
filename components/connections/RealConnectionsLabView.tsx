"use client";

import { useCallback, useEffect, useState } from "react";
import {
  runRealConnectionsLab,
  type RealConnectionsLabSnapshot,
} from "@/lib/lab/real-connections-lab";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Status } from "@/components/ui/fhis/Status";
import type { ConnectionProvider } from "@/lib/connections/shared/types";

const PROVIDERS: ConnectionProvider[] = ["github", "supabase", "vercel", "cloudflare"];

function healthVariant(healthy: boolean, configured: boolean): "default" | "accent" | "amber" | "red" {
  if (!configured) return "amber";
  return healthy ? "accent" : "red";
}

export function RealConnectionsLabView() {
  const [data, setData] = useState<RealConnectionsLabSnapshot | null>(null);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ConnectionProvider>("github");

  const refresh = useCallback(() => {
    runRealConnectionsLab().then(setData);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function callApi(path: string, body: Record<string, unknown>) {
    setLoading(true);
    setActionResult(null);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      setActionResult(JSON.stringify(json, null, 2));
      refresh();
    } catch (err) {
      setActionResult(err instanceof Error ? err.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  if (!data) {
    return (
      <Container>
        <p>Cargando Real Connections…</p>
      </Container>
    );
  }

  const configuredCount = data.overview.auth.filter((a) => a.configured).length;

  return (
    <Container className="fhis-real-connections-lab">
      <SectionHeader
        title="Real Connections"
        subtitle="RC5 — Secure external tool integration (dry-run default, no production from lab)"
      />

      <Stack gap="lg">
        <Panel>
          <SectionHeader title="Connection Status" subtitle="Server-side credential presence" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
            <KpiBlock label="Providers" value={String(PROVIDERS.length)} />
            <KpiBlock label="Configured" value={String(configuredCount)} />
            <KpiBlock label="Capabilities" value={String(data.capabilities.length)} />
            <KpiBlock label="Audit entries" value={String(data.overview.audit.length)} />
          </div>
          <div style={{ display: "grid", gap: 8 }}>
            {data.health.map((h) => (
              <div
                key={h.provider}
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 1fr 100px",
                  gap: 8,
                  fontSize: 12,
                  padding: "6px 10px",
                  borderBottom: "1px solid var(--fhis-color-border)",
                }}
              >
                <strong>{h.provider}</strong>
                <span style={{ opacity: 0.8 }}>{h.message}</span>
                <Badge variant={healthVariant(h.healthy, h.configured)}>
                  {h.configured ? (h.healthy ? "OK" : "FAIL") : "NO KEY"}
                </Badge>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Connected Capabilities" subtitle="Capability → provider mapping" />
          <div style={{ display: "grid", gap: 6, maxHeight: 200, overflow: "auto" }}>
            {data.capabilities.map((c) => (
              <div
                key={c.capabilityId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 120px",
                  gap: 8,
                  fontSize: 12,
                  padding: "6px 10px",
                  borderBottom: "1px solid var(--fhis-color-border)",
                }}
              >
                <span>{c.capabilityId}</span>
                <Badge variant="default">{c.provider}</Badge>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Actions" subtitle="Server API only — no production execution" />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value as ConnectionProvider)}
              style={{ padding: "6px 10px", fontSize: 13 }}
            >
              {PROVIDERS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <button
              type="button"
              disabled={loading}
              onClick={() => callApi("/api/connections/test", { provider: selectedProvider })}
              style={{ padding: "6px 14px", fontSize: 13, cursor: "pointer" }}
            >
              Test connection
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() =>
                callApi("/api/connections/dry-run", {
                  provider: selectedProvider,
                  operation: "create_repository",
                  payload: { name: "forgeos-lab-demo" },
                })
              }
              style={{ padding: "6px 14px", fontSize: 13, cursor: "pointer" }}
            >
              Generate dry-run plan
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() =>
                callApi("/api/connections/request-approval", {
                  provider: selectedProvider,
                  operation: "create_repository",
                })
              }
              style={{ padding: "6px 14px", fontSize: 13, cursor: "pointer" }}
            >
              Request approval
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() =>
                callApi("/api/connections/dry-run", {
                  provider: selectedProvider,
                  operation: "create_repository",
                  payload: { simulated: true, name: "forgeos-sim" },
                })
              }
              style={{ padding: "6px 14px", fontSize: 13, cursor: "pointer" }}
            >
              Simulate execution
            </button>
          </div>
          {actionResult && (
            <pre style={{ fontSize: 11, maxHeight: 200, overflow: "auto", background: "var(--fhis-color-surface)", padding: 12, borderRadius: 6 }}>
              {actionResult}
            </pre>
          )}
        </Panel>

        {data.sampleDryRun && (
          <Panel>
            <SectionHeader title="Sample Dry-Run Plan" subtitle="GitHub create_repository" />
            <p style={{ fontSize: 13 }}>{data.sampleDryRun.output}</p>
            {data.sampleDryRun.plan && (
              <div style={{ marginTop: 8, fontSize: 12 }}>
                <strong>Steps:</strong>
                <ul>
                  {data.sampleDryRun.plan.steps.map((s) => (
                    <li key={s.stepId}>{s.description}</li>
                  ))}
                </ul>
                <strong>Rollback:</strong>
                <ul>
                  {data.sampleDryRun.plan.rollbackSteps.map((s) => (
                    <li key={s.stepId}>{s.description}</li>
                  ))}
                </ul>
              </div>
            )}
          </Panel>
        )}

        <Panel>
          <SectionHeader title="Governance" subtitle="Risk & approval for connections" />
          <p style={{ fontSize: 13 }}>
            Risk: <Badge variant="amber">{data.sampleApproval.risk.level}</Badge>{" "}
            · Approval: {data.sampleApproval.approval.type}{" "}
            · {data.sampleApproval.approval.approved ? "Granted" : "Pending"}
          </p>
          <Status status="warning" label="Production execution blocked from lab UI" />
        </Panel>

        {data.sampleCapability && (
          <Panel>
            <SectionHeader title="Capability Pipeline" subtitle="create_repository via runCapabilityRequest" />
            <p style={{ fontSize: 13 }}>{data.sampleCapability.output}</p>
            <p style={{ fontSize: 12, opacity: 0.7, marginTop: 8 }}>
              Stages: {data.sampleCapability.stages.join(" → ")}
            </p>
          </Panel>
        )}

        <Panel>
          <SectionHeader title="Audit Log" subtitle="Recent connection attempts (redacted)" />
          <div style={{ display: "grid", gap: 6, maxHeight: 200, overflow: "auto" }}>
            {data.overview.audit.slice(0, 10).map((entry) => (
              <div
                key={entry.id}
                style={{
                  fontSize: 12,
                  padding: "6px 10px",
                  borderBottom: "1px solid var(--fhis-color-border)",
                }}
              >
                <Badge variant="default">{entry.outcome}</Badge>{" "}
                {entry.provider}.{entry.operation} — {entry.details.slice(0, 80)}
              </div>
            ))}
            {data.overview.audit.length === 0 && (
              <p style={{ fontSize: 12, opacity: 0.7 }}>No audit entries yet</p>
            )}
          </div>
        </Panel>
      </Stack>
    </Container>
  );
}
