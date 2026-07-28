"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  runRealExecutionLab,
  type RealExecutionLabSnapshot,
} from "@/lib/lab/real-execution-lab";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Status } from "@/components/ui/fhis/Status";
import type { RealConnectionCapability } from "@/lib/connections/shared/types";
import type { ApprovalSession, ExecutionGate } from "@/lib/real-execution/types";

const CAPABILITIES: RealConnectionCapability[] = [
  "create_repository",
  "create_branch",
  "open_pull_request",
  "create_environment",
  "deploy_software",
  "create_database",
  "configure_domain",
];

function riskVariant(level: string): "default" | "accent" | "amber" | "red" {
  if (level === "CRITICAL" || level === "critical") return "red";
  if (level === "HIGH" || level === "high") return "amber";
  if (level === "MEDIUM" || level === "medium") return "amber";
  return "accent";
}

function gateVariant(passed: boolean): "accent" | "red" {
  return passed ? "accent" : "red";
}

export function RealExecutionLabView() {
  const [data, setData] = useState<RealExecutionLabSnapshot | null>(null);
  const [selectedCapability, setSelectedCapability] =
    useState<RealConnectionCapability>("create_repository");
  const [session, setSession] = useState<ApprovalSession | null>(null);
  const [dryRunOutput, setDryRunOutput] = useState<Record<string, unknown> | null>(null);
  const [executeOutput, setExecuteOutput] = useState<Record<string, unknown> | null>(null);
  const [gates, setGates] = useState<ExecutionGate[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const refresh = useCallback(() => {
    runRealExecutionLab().then(setData);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function callApi(path: string, body: Record<string, unknown>) {
    setLoading(true);
    try {
      const res = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      return await res.json();
    } finally {
      setLoading(false);
    }
  }

  async function handleDryRun() {
    const json = await callApi("/api/real-execution/dry-run", {
      capabilityId: selectedCapability,
      payload: { name: "forgeos-rc51-lab", private: true },
    });
    setDryRunOutput(json);
    setStep(2);
    refresh();
  }

  async function handleRequestApproval() {
    const json = await callApi("/api/real-execution/request-approval", {
      capabilityId: selectedCapability,
      payload: { name: "forgeos-rc51-lab", private: true },
    });
    if (json.session) setSession(json.session);
    setDryRunOutput((prev) => ({ ...prev, approval: json }));
    setStep(5);
    refresh();
  }

  async function handleApprove() {
    if (!session?.id) return;
    const json = await callApi("/api/real-execution/approve", {
      sessionId: session.id,
      approvedBy: "ceo",
      rationale: "Lab simulated human approval",
    });
    if (json.session) setSession(json.session);
    setStep(6);
    refresh();
  }

  async function handleReject() {
    if (!session?.id) return;
    const json = await callApi("/api/real-execution/approve", {
      sessionId: session.id,
      rejectedBy: "ceo",
      action: "reject",
      rationale: "Lab simulated rejection",
    });
    if (json.session) setSession(json.session);
    refresh();
  }

  async function handleExecute() {
    const json = await callApi("/api/real-execution/execute", {
      capabilityId: selectedCapability,
      approvalSessionId: session?.id,
      approvedBy: "ceo",
      mode: "sandbox",
      userConfirmed: true,
      payload: { name: "forgeos-rc51-lab", private: true },
    });
    setExecuteOutput(json);
    if (json.result?.gates) setGates(json.result.gates);
    setStep(8);
    refresh();
  }

  const risk = useMemo(() => {
    const fromDryRun = dryRunOutput?.request as { risk?: { level: string } } | undefined;
    const fromApproval = (dryRunOutput?.approval as { risk?: { level: string } })?.risk;
    return fromApproval ?? fromDryRun?.risk;
  }, [dryRunOutput]);

  const requiredPermissions = useMemo(() => {
    const fromDryRun = dryRunOutput?.request as { requiredPermissions?: string[] } | undefined;
    const fromApproval = (dryRunOutput?.approval as { requiredPermissions?: string[] })
      ?.requiredPermissions;
    return fromApproval ?? fromDryRun?.requiredPermissions ?? [];
  }, [dryRunOutput]);

  const canExecute = session?.status === "approved";

  if (!data) {
    return (
      <Container>
        <p>Loading Real Execution Lab…</p>
      </Container>
    );
  }

  return (
    <Container className="fhis-real-execution-lab">
      <SectionHeader
        title="Real Execution Approval Layer"
        subtitle="RC5.1 — Mandatory dry-run, human approval, audit, and rollback before real execution"
      />

      <Stack gap="lg">
        <Panel>
          <SectionHeader title="Policy Status" subtitle="Server-side gates (no credentials exposed)" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
            <KpiBlock
              label="Real execution"
              value={data.policy.realExecutionEnabled ? "ON" : "OFF"}
            />
            <KpiBlock label="Providers" value={String(data.policy.allowedProviders.length)} />
            <KpiBlock
              label="Approval required"
              value={data.policy.approvalRequired ? "YES" : "NO"}
            />
            <KpiBlock label="Allowed actions" value={String(data.allowedActions.length)} />
          </div>
          <p>RC5.3 mode: {data.flags.modeLabel}</p>
          <p>
            Provider flags: GH {data.flags.enableRealGithub ? "ON" : "OFF"} / Vercel{" "}
            {data.flags.enableRealVercel ? "ON" : "OFF"} / Supabase{" "}
            {data.flags.enableRealSupabase ? "ON" : "OFF"} / CF{" "}
            {data.flags.enableRealCloudflare ? "ON" : "OFF"}
          </p>
          {!data.policy.realExecutionEnabled && (
            <Status status="warning" label="ENABLE_REAL_EXECUTION=false — sandbox/dry-run only" />
          )}
        </Panel>

        <Panel>
          <SectionHeader title="Step 1 — Capability Selector" subtitle={`Current step: ${step}/9`} />
          <select
            value={selectedCapability}
            onChange={(e) => {
              setSelectedCapability(e.target.value as RealConnectionCapability);
              setSession(null);
              setDryRunOutput(null);
              setExecuteOutput(null);
              setGates([]);
              setStep(1);
            }}
            style={{ padding: "8px 12px", fontSize: 13, minWidth: 240 }}
          >
            {CAPABILITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Panel>

        <Panel>
          <SectionHeader title="Step 2 — Dry-Run Plan" subtitle="Generate plan via lib/connections" />
          <button
            type="button"
            disabled={loading}
            onClick={handleDryRun}
            style={{ padding: "6px 14px", fontSize: 13, cursor: "pointer", marginBottom: 12 }}
          >
            Generate dry-run
          </button>
          {dryRunOutput?.dryRunResult ? (
            <div style={{ fontSize: 12 }}>
              <p>{(dryRunOutput.dryRunResult as { output: string }).output}</p>
              {(dryRunOutput.dryRunResult as { plan?: { steps: { description: string }[] } }).plan ? (
                <ul>
                  {(
                    dryRunOutput.dryRunResult as { plan: { steps: { description: string }[] } }
                  ).plan.steps.map((s, i) => (
                    <li key={i}>{s.description}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}
          {!dryRunOutput && data.sampleDryRun ? (
            <p style={{ fontSize: 12, opacity: 0.7 }}>
              Sample: {data.sampleDryRun.dryRunResult.output}
            </p>
          ) : null}
        </Panel>

        <Panel>
          <SectionHeader title="Step 3 — Risk Level" subtitle="Via skills-governance risk-engine" />
          {risk ? (
            <Badge variant={riskVariant(risk.level)}>{risk.level}</Badge>
          ) : (
            <span style={{ fontSize: 12, opacity: 0.7 }}>Run dry-run to assess risk</span>
          )}
        </Panel>

        <Panel>
          <SectionHeader title="Step 4 — Required Permissions" />
          {requiredPermissions.length > 0 ? (
            <ul style={{ fontSize: 12 }}>
              {requiredPermissions.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          ) : (
            <span style={{ fontSize: 12, opacity: 0.7 }}>Run dry-run to see permissions</span>
          )}
        </Panel>

        <Panel>
          <SectionHeader title="Step 5–6 — Human Approval" subtitle="Simulate founder/CEO approval in lab" />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
            <button
              type="button"
              disabled={loading}
              onClick={handleRequestApproval}
              style={{ padding: "6px 14px", fontSize: 13, cursor: "pointer" }}
            >
              Request approval
            </button>
            <button
              type="button"
              disabled={loading || !session || session.status !== "pending"}
              onClick={handleApprove}
              style={{ padding: "6px 14px", fontSize: 13, cursor: "pointer" }}
            >
              Approve (simulate CEO)
            </button>
            <button
              type="button"
              disabled={loading || !session || session.status !== "pending"}
              onClick={handleReject}
              style={{ padding: "6px 14px", fontSize: 13, cursor: "pointer" }}
            >
              Reject
            </button>
          </div>
          {session && (
            <p style={{ fontSize: 13 }}>
              Session: <code>{session.id.slice(0, 8)}…</code>{" "}
              <Badge variant={session.status === "approved" ? "accent" : "amber"}>
                {session.status}
              </Badge>
            </p>
          )}
        </Panel>

        <Panel>
          <SectionHeader title="Step 7 — Execute" subtitle="Disabled unless all gates pass" />
          <button
            type="button"
            disabled={loading || !canExecute}
            onClick={handleExecute}
            style={{
              padding: "6px 14px",
              fontSize: 13,
              cursor: canExecute ? "pointer" : "not-allowed",
              opacity: canExecute ? 1 : 0.5,
            }}
          >
            Execute (sandbox)
          </button>
          {!canExecute && (
            <p style={{ fontSize: 12, marginTop: 8, opacity: 0.7 }}>
              Requires approved session. Real execution also needs ENABLE_REAL_EXECUTION=true.
            </p>
          )}
          {gates.length > 0 && (
            <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
              {gates.map((g) => (
                <div
                  key={g.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "160px 80px 1fr",
                    gap: 8,
                    fontSize: 12,
                    padding: "4px 0",
                    borderBottom: "1px solid var(--fhis-color-border)",
                  }}
                >
                  <span>{g.name}</span>
                  <Badge variant={gateVariant(g.passed)}>{g.passed ? "PASS" : "FAIL"}</Badge>
                  <span style={{ opacity: 0.8 }}>{g.reason}</span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel>
          <SectionHeader title="Step 8 — Result" />
          {executeOutput?.result ? (
            <pre style={{ fontSize: 11, maxHeight: 180, overflow: "auto", padding: 12, background: "var(--fhis-color-surface)", borderRadius: 6 }}>
              {JSON.stringify(executeOutput.result, null, 2)}
            </pre>
          ) : (
            <span style={{ fontSize: 12, opacity: 0.7 }}>No execution result yet</span>
          )}
        </Panel>

        <Panel>
          <SectionHeader title="Step 9 — Rollback Plan" />
          {executeOutput?.rollbackPlan || dryRunOutput?.rollbackPlan ? (
            <ul style={{ fontSize: 12 }}>
              {(
                (executeOutput?.rollbackPlan ?? dryRunOutput?.rollbackPlan) as {
                  rollbackSteps?: { description: string }[];
                }
              )?.rollbackSteps?.map((s, i) => (
                <li key={i}>{s.description}</li>
              )) ?? <li>Governance rollback steps available</li>}
            </ul>
          ) : (
            <span style={{ fontSize: 12, opacity: 0.7 }}>Rollback plan shown after dry-run</span>
          )}
        </Panel>

        <Panel>
          <SectionHeader title="Audit Log Timeline" subtitle="All execution attempts (redacted)" />
          <div style={{ display: "grid", gap: 6, maxHeight: 220, overflow: "auto" }}>
            {data.audit.map((entry) => (
              <div
                key={entry.id}
                style={{
                  fontSize: 12,
                  padding: "6px 10px",
                  borderBottom: "1px solid var(--fhis-color-border)",
                }}
              >
                <Badge variant="default">{entry.outcome}</Badge>{" "}
                {new Date(entry.timestamp).toLocaleTimeString()} — {entry.capabilityId} (
                {entry.mode}) — {entry.details.slice(0, 60)}
              </div>
            ))}
            {data.audit.length === 0 && (
              <p style={{ fontSize: 12, opacity: 0.7 }}>No audit entries yet</p>
            )}
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Allowed vs Forbidden" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 12 }}>
            <div>
              <strong>Allowed</strong>
              <ul>
                {data.allowedActions.map((a) => (
                  <li key={a.capabilityId}>{a.description}</li>
                ))}
              </ul>
            </div>
            <div>
              <strong>Forbidden patterns</strong>
              <ul>
                {data.forbiddenPatterns.map((f) => (
                  <li key={f.pattern}>{f.pattern}: {f.reason}</li>
                ))}
              </ul>
            </div>
          </div>
        </Panel>
      </Stack>
    </Container>
  );
}
