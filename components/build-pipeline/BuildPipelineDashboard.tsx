"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  runBuildPipelineLab,
  type BuildPipelineLabSnapshot,
} from "@/lib/lab/build-pipeline-lab";
import { Container, Grid, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";
import { Status } from "@/components/ui/fhis/Status";
import { DeploymentTimeline } from "./DeploymentTimeline";
import type { ApprovalSession } from "@/lib/real-execution/types";
import type { PipelineStage } from "@/lib/build-pipeline/types";

function riskVariant(level: string): "default" | "accent" | "amber" | "red" {
  if (level === "CRITICAL") return "red";
  if (level === "HIGH" || level === "MEDIUM") return "amber";
  return "accent";
}

function stageStatus(status: PipelineStage["status"]): "idle" | "active" | "success" | "warning" | "error" | "pending" {
  if (status === "completed") return "success";
  if (status === "blocked" || status === "failed") return "error";
  if (status === "running") return "active";
  if (status === "pending") return "pending";
  return "idle";
}

function providerLabel(provider: string): string {
  const labels: Record<string, string> = {
    github: "GitHub",
    supabase: "Supabase",
    vercel: "Vercel",
    cloudflare: "Cloudflare",
  };
  return labels[provider] ?? provider;
}

export function BuildPipelineDashboard() {
  const [data, setData] = useState<BuildPipelineLabSnapshot | null>(null);
  const [pipelineResult, setPipelineResult] = useState<Record<string, unknown> | null>(null);
  const [session, setSession] = useState<ApprovalSession | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    runBuildPipelineLab().then(setData);
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
    const json = await callApi("/api/build-pipeline/dry-run", { requestedBy: "cto" });
    setPipelineResult(json);
    refresh();
  }

  async function handleRequestApproval() {
    const json = await callApi("/api/build-pipeline/request-approval", { requestedBy: "cto" });
    setPipelineResult(json);
    if (json?.approval?.session) setSession(json.approval.session);
    refresh();
  }

  async function handleApprove() {
    if (!session?.id) return;
    const json = await callApi("/api/real-build-flow/approve", {
      sessionId: session.id,
      approvedBy: "founder",
    });
    if (json?.session) setSession(json.session);
    refresh();
  }

  const pipeline = (pipelineResult?.snapshot ?? pipelineResult ?? data?.pipeline) as
    | BuildPipelineLabSnapshot["pipeline"]
    | undefined;
  const policy = data?.policy;
  const flags = data?.flags;
  const mode = pipeline?.mode ?? "dry_run";
  const isDryRun = mode === "dry_run" || !flags?.enableRealBuildFlow;
  const report = pipeline?.buildReport;
  const rollback = pipeline?.rollbackPlan;

  return (
    <Container>
      <Stack gap="lg">
        <SectionHeader
          title="Pipeline de Build"
          description="Program 3000 Sprint 5 — GitHub, Supabase y Vercel unificados. Solo preview, aprobación requerida, dry-run por defecto."
          action={
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Badge variant={isDryRun ? "accent" : "amber"}>
                {isDryRun ? "DRY-RUN" : "MODO REAL"}
              </Badge>
              <Badge variant="blue">PREVIEW ONLY</Badge>
              {rollback?.ready && <Badge variant="accent">ROLLBACK LISTO</Badge>}
            </div>
          }
        />

        <Grid cols={4} gap="md">
          <KpiBlock label="Modo pipeline" value={isDryRun ? "Dry-run" : "Preview"} />
          <KpiBlock
            label="Aprobación"
            value={policy?.requireApproval ? "Requerida" : "Opcional"}
          />
          <KpiBlock
            label="Etapas"
            value={report ? `${report.stagesCompleted}/${report.stagesTotal}` : "—"}
          />
          <KpiBlock
            label="Riesgo"
            value={pipeline?.risk?.level ?? report?.riskLevel ?? "—"}
          />
        </Grid>

        <Panel>
          <SectionHeader
            title="Salud de conexiones"
            description="Estado de credenciales GitHub, Supabase y Vercel"
          />
          <Grid cols={3} gap="sm">
            {(pipeline?.connectionHealth ?? data?.providerHealth ?? []).map((h) => {
              const provider = h.provider;
              const healthy = "healthy" in h ? h.healthy : true;
              const configured = h.configured;
              return (
                <div key={provider} className="fhis-panel" style={{ padding: 12 }}>
                  <strong>{providerLabel(provider)}</strong>
                  <div style={{ marginTop: 8 }}>
                    <Status
                      status={configured && healthy !== false ? "success" : "warning"}
                      label={configured ? "Configurado" : "Sin credencial"}
                    />
                  </div>
                </div>
              );
            })}
          </Grid>
        </Panel>

        <Grid cols={2} gap="md">
          <Panel>
            <SectionHeader title="Etapas del pipeline" />
            <Stack gap="sm">
              {(pipeline?.stages ?? []).map((stage) => (
                <div
                  key={stage.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "8px 0",
                    borderBottom: "1px solid var(--fhis-color-border-subtle)",
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 13 }}>{stage.label}</strong>
                    {stage.output && (
                      <p style={{ fontSize: 12, margin: "4px 0 0", color: "var(--fhis-color-text-muted)" }}>
                        {stage.output.slice(0, 120)}
                        {stage.output.length > 120 ? "…" : ""}
                      </p>
                    )}
                  </div>
                  <Status status={stageStatus(stage.status)} label="" />
                </div>
              ))}
            </Stack>
          </Panel>

          <Panel>
            <SectionHeader title="Puertas de aprobación" />
            <Stack gap="sm">
              <div className="fhis-panel" style={{ padding: 12 }}>
                <Status
                  status={policy?.requireApproval ? "pending" : "success"}
                  label={policy?.requireApproval ? "Aprobación humana pendiente" : "No requerida"}
                />
                {session && (
                  <p style={{ fontSize: 12, marginTop: 8 }}>
                    Sesión: {session.id.slice(0, 8)}… — {session.status}
                  </p>
                )}
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="fhis-btn fhis-btn-secondary"
                  onClick={handleDryRun}
                  disabled={loading}
                >
                  Ejecutar dry-run
                </button>
                <button
                  type="button"
                  className="fhis-btn fhis-btn-secondary"
                  onClick={handleRequestApproval}
                  disabled={loading}
                >
                  Solicitar aprobación
                </button>
                <button
                  type="button"
                  className="fhis-btn fhis-btn-primary"
                  onClick={handleApprove}
                  disabled={loading || !session || session.status === "approved"}
                >
                  Aprobar
                </button>
              </div>
              <p style={{ fontSize: 11, color: "var(--fhis-color-text-muted)" }}>
                ENABLE_REAL_BUILD_FLOW={String(flags?.enableRealBuildFlow ?? false)} ·
                ENABLE_REAL_EXECUTION={String(flags?.enableRealExecution ?? false)}
              </p>
            </Stack>
          </Panel>
        </Grid>

        <Grid cols={2} gap="md">
          <Panel>
            <SectionHeader title="Informe de build" />
            {report ? (
              <Stack gap="sm">
                <p>
                  <Badge variant={riskVariant(report.riskLevel)}>{report.riskLevel}</Badge>
                </p>
                <p style={{ fontSize: 13 }}>
                  Venture: <strong>{report.ventureName}</strong>
                </p>
                {report.repoUrl && (
                  <p style={{ fontSize: 12, color: "var(--fhis-color-text-muted)" }}>
                    Repo: {report.repoUrl}
                  </p>
                )}
                {report.previewUrl && (
                  <p style={{ fontSize: 12, color: "var(--fhis-color-text-muted)" }}>
                    Preview: {report.previewUrl}
                  </p>
                )}
                <p style={{ fontSize: 11 }}>
                  Generado: {new Date(report.generatedAt).toLocaleString("es-ES")}
                </p>
              </Stack>
            ) : (
              <p className="fhis-text-muted">Ejecuta un dry-run para generar el informe.</p>
            )}
          </Panel>

          <Panel>
            <SectionHeader
              title="Planes generados"
              description="Repositorio, proyectos, migración y rollback"
            />
            <Stack gap="sm">
              {pipeline?.repositoryPlan && (
                <div style={{ fontSize: 13 }}>
                  <strong>Repositorio:</strong> {pipeline.repositoryPlan.repoName} (
                  {pipeline.repositoryPlan.status})
                </div>
              )}
              {pipeline?.deployPreviewPlan && (
                <div style={{ fontSize: 13 }}>
                  <strong>Preview:</strong> {pipeline.deployPreviewPlan.previewUrl}
                </div>
              )}
              {pipeline?.migrationPlan && (
                <div style={{ fontSize: 13 }}>
                  <strong>Migraciones:</strong> {pipeline.migrationPlan.migrations.length} archivos
                </div>
              )}
              {rollback && (
                <div style={{ fontSize: 13 }}>
                  <strong>Rollback:</strong>{" "}
                  <Badge variant={rollback.ready ? "accent" : "red"}>
                    {rollback.ready ? "Listo" : "Incompleto"}
                  </Badge>
                </div>
              )}
            </Stack>
          </Panel>
        </Grid>

        <Panel>
          <SectionHeader title="Línea temporal de despliegue" />
          <DeploymentTimeline events={pipeline?.timeline ?? []} />
        </Panel>

        <Panel>
          <SectionHeader title="Enlaces relacionados" />
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13 }}>
            <Link href="/lab/real-build-flow">Real Build Flow Lab →</Link>
            <Link href="/lab/real-execution">Real Execution Lab →</Link>
            <Link href="/lab/real-connections">Real Connections →</Link>
            <Link href="/os">ForgeOS OS →</Link>
          </div>
        </Panel>
      </Stack>
    </Container>
  );
}
