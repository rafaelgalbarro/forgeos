"use client";

import { useCallback, useEffect, useState } from "react";
import type { PreviewDeploymentRequest } from "@/lib/preview-deployment/types";
import { canPublishPreview } from "@/lib/preview-deployment/deployment-validator";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { Status } from "@/components/ui/fhis/Status";

interface Props {
  missionId: string;
  ventureId?: string;
  projectId?: string;
}

export function PreviewDeploymentPanel({ missionId, ventureId, projectId = "studio-project" }: Props) {
  const [deployment, setDeployment] = useState<PreviewDeploymentRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [flags, setFlags] = useState<Record<string, unknown> | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch(`/api/preview-deployment/snapshot?missionId=${encodeURIComponent(missionId)}`);
    const json = await res.json();
    if (json.snapshot?.latest) setDeployment(json.snapshot.latest);
    setFlags(json.flags ?? null);
  }, [missionId]);

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

  async function handleDraft() {
    const json = await callApi("/api/preview-deployment/draft", {
      missionId,
      ventureId,
      projectId,
      projectVersion: "1.0.0",
      requestedBy: "founder",
    });
    if (json.request) setDeployment(json.request);
    refresh();
  }

  async function handleApprove() {
    if (!deployment) return;
    const json = await callApi("/api/preview-deployment/approve", {
      deploymentId: deployment.deploymentId,
      approvedBy: "founder",
    });
    if (json.request) setDeployment(json.request);
    refresh();
  }

  async function handlePublish() {
    if (!deployment) return;
    const json = await callApi("/api/preview-deployment/execute", {
      missionId,
      ventureId,
      projectId,
      projectVersion: deployment.projectVersion,
      sandboxBuildId: deployment.sandboxBuildId,
      requestedBy: "founder",
      userConfirmed: true,
    });
    if (json.request) setDeployment(json.request);
    refresh();
  }

  async function handleRollback() {
    if (!deployment) return;
    const json = await callApi("/api/preview-deployment/rollback", {
      deploymentId: deployment.deploymentId,
      actor: "founder",
    });
    if (json.request) setDeployment(json.request);
    refresh();
  }

  const preconditions = deployment?.preconditions ?? [];
  const gatesPass = preconditions.length > 0 ? canPublishPreview(preconditions) : false;
  const approved = deployment?.approval.status === "approved";
  const canPublish = gatesPass && approved && deployment?.status !== "READY" && deployment?.status !== "READY_WITH_PLAN";
  const isDryRun = deployment?.dryRun ?? true;

  return (
    <Panel>
      <Stack gap="md">
        <SectionHeader title="Publicar Preview" subtitle="PROGRAM 5380 — One-Click Preview Deployment" />

        <div
          style={{
            padding: 12,
            borderRadius: 8,
            background: isDryRun ? "#fef3c7" : "#dcfce7",
            border: `1px solid ${isDryRun ? "#f59e0b" : "#22c55e"}`,
            fontSize: "0.8rem",
          }}
        >
          {isDryRun
            ? "DRY RUN / PREVIEW PLAN / NOT DEPLOYED — sin URLs reales"
            : "Real preview deployment — URLs verificadas"}
        </div>

        {flags && (
          <div style={{ fontSize: "0.75rem", color: "var(--fhis-color-text-muted)" }}>
            Flags: deployment={String((flags as { enablePreviewDeployment?: boolean }).enablePreviewDeployment)} ·
            github={String((flags as { enableGithubPush?: boolean }).enableGithubPush)} ·
            vercel={String((flags as { enableVercelDeployment?: boolean }).enableVercelDeployment)} ·
            supabase={String((flags as { enableSupabaseSetup?: boolean }).enableSupabaseSetup)}
          </div>
        )}

        <SectionHeader title="Precondiciones" />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {preconditions.map((p) => (
            <Badge key={p.id} variant={p.passed ? "accent" : p.blocking ? "red" : "amber"}>
              {p.label}: {p.passed ? "✓" : "✗"}
            </Badge>
          ))}
          {preconditions.length === 0 && (
            <span style={{ fontSize: "0.8rem" }}>Sin draft — crea uno para validar gates</span>
          )}
        </div>

        {deployment && (
          <>
            <SectionHeader title="Estado" />
            <Status
              status={
                deployment.status === "READY" || deployment.status === "READY_WITH_PLAN"
                  ? "success"
                  : deployment.status === "FAILED" || deployment.status === "BLOCKED"
                    ? "error"
                    : "active"
              }
              label={deployment.status}
            />

            {deployment.repository && (
              <div style={{ fontSize: "0.8rem" }}>
                <strong>Repository:</strong> {deployment.repository.fullName} ({deployment.repository.dryRun ? "plan" : "created"})
              </div>
            )}
            {deployment.vercel && (
              <div style={{ fontSize: "0.8rem" }}>
                <strong>Vercel:</strong> {deployment.vercel.dryRun ? "Preview Plan" : deployment.vercel.previewUrl ?? "—"}
              </div>
            )}
            {deployment.supabase && (
              <div style={{ fontSize: "0.8rem" }}>
                <strong>Supabase:</strong> {deployment.supabase.dryRun ? "Sandbox plan" : deployment.supabase.projectUrl ?? "—"}
              </div>
            )}
            {deployment.previewUrl && (
              <div style={{ fontSize: "0.85rem" }}>
                <strong>Preview URL:</strong>{" "}
                <a href={deployment.previewUrl} target="_blank" rel="noopener noreferrer">
                  {deployment.previewUrl}
                </a>
              </div>
            )}

            {deployment.healthCheck && (
              <>
                <SectionHeader title="Health Check" />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {deployment.healthCheck.checks.map((c) => (
                    <Badge key={c.id} variant={c.status === "pass" ? "accent" : "amber"}>
                      {c.label}: {c.status}
                    </Badge>
                  ))}
                </div>
              </>
            )}

            {deployment.smokeTests.length > 0 && (
              <>
                <SectionHeader title="Smoke Tests" />
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {deployment.smokeTests.map((t) => (
                    <Badge key={t.id} variant={t.status === "pass" ? "accent" : "amber"}>
                      {t.label}: {t.status}
                    </Badge>
                  ))}
                </div>
              </>
            )}

            {deployment.logs.length > 0 && (
              <>
                <SectionHeader title="Logs" />
                <pre style={{ fontSize: "0.7rem", maxHeight: 120, overflow: "auto", margin: 0 }}>
                  {deployment.logs.slice(-8).join("\n")}
                </pre>
              </>
            )}
          </>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="fhis-btn fhis-btn-ghost fhis-btn-sm" onClick={handleDraft} disabled={loading}>
            Validar precondiciones
          </button>
          <button
            type="button"
            className="fhis-btn fhis-btn-ghost fhis-btn-sm"
            onClick={handleApprove}
            disabled={loading || !deployment || approved}
          >
            Aprobar
          </button>
          <button
            type="button"
            className="fhis-btn fhis-btn-primary fhis-btn-sm"
            onClick={handlePublish}
            disabled={loading || !canPublish}
            title={!canPublish ? "Todos los gates y aprobación requeridos" : undefined}
          >
            Publicar Preview
          </button>
          {(deployment?.status === "READY" || deployment?.status === "READY_WITH_PLAN") && (
            <button type="button" className="fhis-btn fhis-btn-ghost fhis-btn-sm" onClick={handleRollback} disabled={loading}>
              Rollback
            </button>
          )}
        </div>
      </Stack>
    </Panel>
  );
}
