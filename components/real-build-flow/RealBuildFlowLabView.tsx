"use client";

import { useCallback, useEffect, useState } from "react";
import {
  runRealBuildFlowLab,
  type RealBuildFlowLabSnapshot,
} from "@/lib/lab/real-build-flow-lab";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Status } from "@/components/ui/fhis/Status";
import type { ApprovalSession } from "@/lib/real-execution/types";

function riskVariant(level: string): "default" | "accent" | "amber" | "red" {
  if (level === "CRITICAL") return "red";
  if (level === "HIGH" || level === "MEDIUM") return "amber";
  return "accent";
}

export function RealBuildFlowLabView() {
  const [data, setData] = useState<RealBuildFlowLabSnapshot | null>(null);
  const [flowResult, setFlowResult] = useState<Record<string, unknown> | null>(null);
  const [session, setSession] = useState<ApprovalSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const refresh = useCallback(() => {
    runRealBuildFlowLab().then(setData);
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
    const json = await callApi("/api/real-build-flow/dry-run", { requestedBy: "cto" });
    setFlowResult(json);
    setStep(6);
    refresh();
  }

  async function handleRequestApproval() {
    const json = await callApi("/api/real-build-flow/request-approval", { requestedBy: "cto" });
    setFlowResult(json);
    if (json?.approval?.session) setSession(json.approval.session);
    setStep(8);
    refresh();
  }

  async function handleApprove() {
    if (!session?.id) return;
    const json = await callApi("/api/real-build-flow/approve", {
      sessionId: session.id,
      approvedBy: "founder",
    });
    if (json?.session) setSession(json.session);
    setStep(8);
    refresh();
  }

  const [controlledResult, setControlledResult] = useState<Record<string, unknown> | null>(null);

  const flags = data?.flags;
  const realEnabled =
    flags?.enableRealExecution &&
    (flags.enableRealGithub ||
      flags.enableRealVercel ||
      flags.enableRealSupabase ||
      flags.enableRealCloudflare);
  const canRunReal =
    realEnabled &&
    session?.status === "approved" &&
    (controlledResult as { allGuardsPassed?: boolean } | null)?.allGuardsPassed !== false;

  async function handleSimulateReal() {
    const json = await callApi("/api/real-build-flow/simulate-real", { requestedBy: "cto" });
    setControlledResult(json);
    refresh();
  }

  async function handleControlledExecute() {
    const json = await callApi("/api/real-build-flow/controlled-execute", {
      requestedBy: "cto",
      approvalSessionId: session?.id,
      userConfirmed: true,
    });
    setControlledResult(json);
    refresh();
  }

  async function handleExecute() {
    const json = await callApi("/api/real-build-flow/execute", {
      requestedBy: "cto",
      approvalSessionId: session?.id,
      userConfirmed: true,
    });
    setFlowResult(json);
    setStep(16);
    refresh();
  }

  const dry = flowResult?.sampleDryRun ?? flowResult?.dryRun ?? flowResult;
  const steps = Array.isArray((dry as { steps?: unknown[] })?.steps)
    ? ((dry as { steps: { stepId: string; label: string; status: string; output: string }[] }).steps)
    : data?.sampleDryRun?.steps ?? [];

  return (
    <Container>
      <Stack gap="lg">
        <SectionHeader
          title="Real Build Flow"
          subtitle="RC5.2 + RC5.3 — Venture → preview (dry-run default)"
        />

        {data && (
          <div className="fhis-kpi-row">
            <KpiBlock label="Mode" value={data.flags.modeLabel} />
            <KpiBlock label="Real build" value={data.policy.enableRealBuildFlow ? "ON" : "OFF"} />
            <KpiBlock label="Real execution" value={data.flags.enableRealExecution ? "ON" : "OFF"} />
            <KpiBlock label="Venture" value={data.venture.name} />
          </div>
        )}

        {flags && (
          <Panel>
            <SectionHeader title="RC5.3 Flags" />
            <p>GitHub: {flags.enableRealGithub ? "ON" : "OFF"}</p>
            <p>Vercel: {flags.enableRealVercel ? "ON" : "OFF"}</p>
            <p>Supabase: {flags.enableRealSupabase ? "ON" : "OFF"}</p>
            <p>Cloudflare: {flags.enableRealCloudflare ? "ON" : "OFF"}</p>
            <p>Destructive: {flags.allowDestructive ? "ALLOWED" : "BLOCKED"}</p>
          </Panel>
        )}

        {data?.providerHealth && (
          <Panel>
            <SectionHeader title="Provider health" />
            <Stack gap="sm">
              {data.providerHealth.map((h) => (
                <div key={h.provider}>
                  <Status
                    status={h.configured ? (h.healthy ? "success" : "warning") : "idle"}
                    label={`${h.provider} — ${h.message}`}
                  />
                </div>
              ))}
            </Stack>
          </Panel>
        )}

        <Panel>
          <SectionHeader title="Flow controls" subtitle={`Step ${step} / 16`} />
          <Stack gap="sm">
            <button type="button" disabled={loading} onClick={handleDryRun}>
              1–6 Generate dry-run
            </button>
            <button type="button" disabled={loading} onClick={handleRequestApproval}>
              8 Request approval
            </button>
            <button type="button" disabled={loading || !session} onClick={handleApprove}>
              Approve (simulate founder)
            </button>
            <button
              type="button"
              disabled={loading || (data?.policy.requireApproval && session?.status !== "approved")}
              onClick={handleExecute}
            >
              9–16 Execute build flow
            </button>
            <button type="button" disabled={loading} onClick={handleSimulateReal}>
              Simular ejecución real
            </button>
            <button
              type="button"
              disabled={loading || !canRunReal}
              onClick={handleControlledExecute}
              title={
                !realEnabled
                  ? "Enable ENABLE_REAL_EXECUTION + provider flags"
                  : session?.status !== "approved"
                    ? "Approval required"
                    : ""
              }
            >
              Ejecutar acción real aprobada
            </button>
          </Stack>
        </Panel>

        {data?.sampleDryRun && (
          <>
            <Panel>
              <SectionHeader title="Build Context" />
              <p>Completeness: {data.sampleDryRun.buildContext.meta.completenessScore}%</p>
            </Panel>
            <Panel>
              <SectionHeader title="Build DNA" />
              <p>
                Stack: {data.sampleDryRun.buildDna.stack.framework} +{" "}
                {data.sampleDryRun.buildDna.stack.database}
              </p>
            </Panel>
            <Panel>
              <SectionHeader title="Release Package" />
              <p>ID: {data.sampleDryRun.releasePackage.releaseId}</p>
            </Panel>
            <Panel>
              <SectionHeader title="Execution Plan" />
              <p>{data.sampleDryRun.executionPlan.planId}</p>
              <p>{data.sampleDryRun.executionPlan.steps.length} steps</p>
            </Panel>
            <Panel>
              <SectionHeader title="Risk" />
              <Badge variant={riskVariant(data.sampleDryRun.riskLevel)}>
                {data.sampleDryRun.riskLevel}
              </Badge>
              <ul>
                {data.sampleDryRun.riskFactors.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </Panel>
          </>
        )}

        <Panel>
          <SectionHeader title="Steps" />
          <Stack gap="sm">
            {steps.map((s) => (
              <div key={s.stepId}>
                <Status
                  status={s.status === "completed" ? "success" : "pending"}
                  label={s.label}
                />
                <small>{s.output}</small>
              </div>
            ))}
          </Stack>
        </Panel>

        {session && (
          <Panel>
            <SectionHeader title="Approval status" />
            <Badge variant={session.status === "approved" ? "accent" : "amber"}>
              {session.status}
            </Badge>
            <p>Session: {session.id}</p>
          </Panel>
        )}

        {flowResult && (flowResult as { rollbackPlan?: { summary?: string } }).rollbackPlan && (
          <Panel>
            <SectionHeader title="Rollback plan" />
            <p>{(flowResult as { rollbackPlan: { summary: string } }).rollbackPlan.summary}</p>
          </Panel>
        )}

        {flowResult && (flowResult as { previewUrl?: string }).previewUrl && (
          <Panel>
            <SectionHeader title="Final result" />
            <p>Preview: {(flowResult as { previewUrl: string }).previewUrl}</p>
            <p>Repo: {(flowResult as { repoUrl?: string }).repoUrl}</p>
          </Panel>
        )}

        {controlledResult && (
          <>
            <Panel>
              <SectionHeader title="Execution guard" />
              <Stack gap="sm">
                {Array.isArray((controlledResult as { guards?: { name: string; passed: boolean; reason: string }[] }).guards) &&
                  (controlledResult as { guards: { name: string; passed: boolean; reason: string }[] }).guards.map(
                    (g) => (
                      <div key={g.name}>
                        <Status status={g.passed ? "success" : "error"} label={g.name} />
                        <small>{g.reason}</small>
                      </div>
                    )
                  )}
              </Stack>
            </Panel>
            <Panel>
              <SectionHeader title="Provider steps (RC5.3)" />
              <Stack gap="sm">
                {Array.isArray(
                  (controlledResult as { providerResults?: { provider: string; output: string; executed: boolean }[] })
                    .providerResults
                ) &&
                  (controlledResult as { providerResults: { provider: string; output: string; executed: boolean }[] })
                    .providerResults.map((r) => (
                      <div key={r.provider}>
                        <Badge variant="default">{r.provider}</Badge>
                        {r.executed ? " EXECUTED" : " PLANNED"} — {r.output}
                      </div>
                    ))}
              </Stack>
            </Panel>
          </>
        )}

        <Panel>
          <SectionHeader title="Audit log" />
          <Stack gap="sm">
            {data?.audit.slice(0, 10).map((a) => (
              <div key={a.id}>
                <Badge variant="default">{a.outcome}</Badge> {a.details}
              </div>
            ))}
          </Stack>
        </Panel>
      </Stack>
    </Container>
  );
}
