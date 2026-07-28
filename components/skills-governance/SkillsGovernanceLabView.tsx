"use client";

import { useEffect, useState } from "react";
import {
  runSkillsGovernanceLab,
  type SkillsGovernanceLabSnapshot,
} from "@/lib/lab/skills-governance-lab";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Status } from "@/components/ui/fhis/Status";

function riskVariant(level: string): "default" | "accent" | "amber" | "red" {
  if (level === "CRITICAL") return "red";
  if (level === "HIGH") return "amber";
  if (level === "MEDIUM") return "accent";
  return "default";
}

export function SkillsGovernanceLabView() {
  const [data, setData] = useState<SkillsGovernanceLabSnapshot | null>(null);

  useEffect(() => {
    runSkillsGovernanceLab().then(setData);
  }, []);

  if (!data) {
    return (
      <Container>
        <p>Cargando Skills Governance…</p>
      </Container>
    );
  }

  const sample = data.sampleExecution;

  return (
    <Container className="fhis-skills-governance-lab">
      <SectionHeader
        title="Skills Safety & Governance"
        subtitle="RC4.1 — Risk, Permission, Approval, Policy, Execution Guard (sandbox)"
      />

      <Stack gap="lg">
        <Panel>
          <SectionHeader title="Execution Flow" subtitle="Governance pipeline stages" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {(sample?.stages ?? [
              "request",
              "risk",
              "permission",
              "approval",
              "policy",
              "execution",
              "audit",
              "memory",
              "decision_graph",
              "telemetry",
            ]).map((s, i, arr) => (
              <Badge
                key={s}
                variant={i === arr.length - 1 ? "accent" : "default"}
              >
                {i > 0 && "→ "}
                {s}
              </Badge>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
            <KpiBlock label="Audit records" value={String(data.auditLog.length)} />
            <KpiBlock label="Approvals" value={String(data.approvalQueue.length)} />
            <KpiBlock label="Security events" value={String(data.securityEvents.length)} />
            <KpiBlock label="History" value={String(data.history.length)} />
            <KpiBlock
              label="Last run"
              value={sample?.governancePassed ? "PASS" : "BLOCKED"}
            />
          </div>
        </Panel>

        {sample && (
          <Panel>
            <SectionHeader title="Sample Execution" subtitle="GitHub create_repository — governed" />
            <p style={{ fontSize: 13 }}>
              Risk: <Badge variant={riskVariant(sample.risk.level)}>{sample.risk.level}</Badge>{" "}
              · Approval: {sample.approval.type} · Sandbox: {sample.sandboxMode}
            </p>
            {sample.skillResult && (
              <p style={{ fontSize: 13, marginTop: 8 }}>{sample.skillResult.output}</p>
            )}
            {sample.blockedReason && (
              <Status status="warning" label={sample.blockedReason} />
            )}
          </Panel>
        )}

        <Panel>
          <SectionHeader title="Risk Matrix" subtitle="Sample skill/action assessments" />
          <div style={{ display: "grid", gap: 6, maxHeight: 200, overflow: "auto" }}>
            {data.riskMatrix.map((r) => (
              <div
                key={`${r.skillId}-${r.action}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "120px 1fr 100px",
                  gap: 8,
                  fontSize: 12,
                  padding: "6px 10px",
                  borderBottom: "1px solid var(--fhis-color-border)",
                }}
              >
                <strong>{r.skillId}</strong>
                <span style={{ opacity: 0.8 }}>{r.action}</span>
                <Badge variant={riskVariant(r.level)}>{r.level}</Badge>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Permissions" subtitle={`${data.permissions.length} default rules`} />
          <div style={{ display: "grid", gap: 6, maxHeight: 180, overflow: "auto", fontSize: 12 }}>
            {data.permissions.map((p) => (
              <div key={p.id}>
                <Badge variant="default">{p.actorType}:{p.actorId}</Badge>{" "}
                {p.effect} — {p.scopes.join(", ")}
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Policies" subtitle={`Sample: vercel deploy_production`} />
          <div style={{ display: "grid", gap: 4, fontSize: 12 }}>
            {data.policySample.evaluations.map((e) => (
              <div key={e.policy}>
                <Status status={e.passed ? "success" : "warning"} label={e.policy} />
                {e.constraints.length > 0 && (
                  <span style={{ opacity: 0.7, marginLeft: 8 }}>{e.constraints.join("; ")}</span>
                )}
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Approval Queue" subtitle={`${data.approvalQueue.length} items`} />
          <div style={{ maxHeight: 120, overflow: "auto", fontSize: 12 }}>
            {data.approvalQueue.slice(0, 8).map((a) => (
              <div key={a.id} style={{ marginBottom: 4 }}>
                {a.skillId} · {a.approvalType} · <Badge variant="default">{a.status}</Badge>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Audit Log" subtitle={`${data.auditLog.length} records`} />
          <div style={{ maxHeight: 140, overflow: "auto", fontSize: 12 }}>
            {data.auditLog.slice(0, 8).map((a) => (
              <div key={a.id} style={{ marginBottom: 4 }}>
                [{a.outcome}] {a.skillId}.{a.action} — {a.what}
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Rollback Plans" />
          <div style={{ display: "grid", gap: 8, fontSize: 12 }}>
            {data.rollbackPlans.slice(0, 4).map((r) => (
              <div key={r.skillId}>
                <strong>{r.skillId}</strong>: {r.steps.length} steps,{" "}
                {r.compensationActions.length} compensation actions
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Security Events" />
          <div style={{ maxHeight: 120, overflow: "auto", fontSize: 12 }}>
            {data.securityEvents.map((e) => (
              <div key={e.id} style={{ marginBottom: 4 }}>
                <Badge variant={e.type === "violation" ? "amber" : "default"}>{e.type}</Badge>{" "}
                {e.skillId}: {e.message} (score {e.score})
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Sandbox Results" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, fontSize: 12 }}>
            {data.sandboxResults.map((s) => (
              <div
                key={s.mode}
                style={{ padding: 10, border: "1px solid var(--fhis-color-border)", borderRadius: 8 }}
              >
                <strong>{s.mode}</strong>
                <p style={{ opacity: 0.8, margin: "4px 0 0" }}>{s.description}</p>
                <p style={{ fontSize: 11, opacity: 0.6 }}>
                  API calls: {s.realApiCalls ? "yes" : "no"} · Network: {s.networkAccess ? "yes" : "no"}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel>
          <SectionHeader title="Governance Events" subtitle={`${data.events.length} events`} />
          <div style={{ maxHeight: 120, overflow: "auto", fontSize: 12 }}>
            {data.events.slice(0, 10).map((e) => (
              <div key={e.id}>
                [{e.stage}] {e.message}
              </div>
            ))}
          </div>
        </Panel>
      </Stack>
    </Container>
  );
}
