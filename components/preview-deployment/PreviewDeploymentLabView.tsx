"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  runPreviewDeploymentLab,
  type PreviewDeploymentLabSnapshot,
} from "@/lib/lab/preview-deployment-lab";
import { PREVIEW_DEPLOYMENT_VERSION } from "@/lib/preview-deployment";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { KpiBlock } from "@/components/ui/fhis/KpiBlock";

export function PreviewDeploymentLabView() {
  const [data, setData] = useState<PreviewDeploymentLabSnapshot | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(() => {
    runPreviewDeploymentLab().then(setData);
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

  async function handleDraft() {
    const json = await callApi("/api/preview-deployment/draft", {
      missionId: "lab-preview-deploy",
      projectId: "lab-project",
      projectVersion: "1.0.0",
      sandboxBuildId: data?.nexoraE2E?.website.sandboxBuildId ?? "sbx-demo",
      requestedBy: "lab",
    });
    setResult(json);
    refresh();
  }

  async function handleExecute() {
    const json = await callApi("/api/preview-deployment/execute", {
      missionId: "lab-preview-deploy",
      projectId: "lab-project",
      projectVersion: "1.0.0",
      sandboxBuildId: data?.nexoraE2E?.website.sandboxBuildId ?? "sbx-demo",
      requestedBy: "lab",
      userConfirmed: true,
    });
    setResult(json);
    refresh();
  }

  const flags = data?.flags;
  const nexora = data?.nexoraE2E;

  return (
    <Container>
      <Stack gap="lg">
        <SectionHeader title="Preview Deployment Lab" subtitle={PREVIEW_DEPLOYMENT_VERSION} />

        {data && (
          <div className="fhis-kpi-row">
            <KpiBlock label="Mode" value={flags?.modeLabel ?? "—"} />
            <KpiBlock label="Deployment" value={flags?.enablePreviewDeployment ? "ON" : "OFF"} />
            <KpiBlock label="GitHub push" value={flags?.enableGithubPush ? "ON" : "OFF"} />
            <KpiBlock label="Vercel" value={flags?.enableVercelDeployment ? "ON" : "OFF"} />
          </div>
        )}

        {flags && (
          <Panel>
            <SectionHeader title="Feature Flags" />
            <p>Supabase: {flags.enableSupabaseSetup ? "ON" : "OFF"}</p>
            <p>Require approval: {flags.requireApproval ? "YES" : "NO"}</p>
            <p>Environment: {flags.environment}</p>
            <p>Allow production: {flags.allowProduction ? "YES (blocked by policy)" : "NO"}</p>
            <p>Dry-run default: {flags.dryRunDefault ? "YES" : "NO"}</p>
          </Panel>
        )}

        {nexora && (
          <Panel>
            <SectionHeader title="NEXORA FIELD E2E" />
            <p style={{ fontSize: "0.85rem" }}>{nexora.disclaimer}</p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
              <Badge variant="accent">Website: {nexora.website.status}</Badge>
              <Badge variant="accent">Webapp: {nexora.webapp.status}</Badge>
              <Badge variant="amber">Mobile: {nexora.mobile.plan}</Badge>
            </div>
            {nexora.missingCredentials.length > 0 && (
              <div style={{ marginTop: 8, fontSize: "0.8rem" }}>
                <strong>Missing for real deploy:</strong>
                <ul>
                  {nexora.missingCredentials.map((c) => (
                    <li key={c}>{c}</li>
                  ))}
                </ul>
              </div>
            )}
            <Link href={`/studio/${nexora.missionId}`} style={{ fontSize: "0.8rem" }}>
              → Output Studio NEXORA
            </Link>
          </Panel>
        )}

        {data?.providerHealth && (
          <Panel>
            <SectionHeader title="Provider Health" />
            {data.providerHealth.map((h) => (
              <p key={h.provider}>
                {h.provider}: {h.configured ? (h.healthy ? "healthy" : "unhealthy") : "not configured"}
              </p>
            ))}
          </Panel>
        )}

        {data?.history && data.history.length > 0 && (
          <Panel>
            <SectionHeader title="Deployment History" />
            <ul style={{ fontSize: "0.8rem" }}>
              {data.history.slice(0, 5).map((h) => (
                <li key={h.deploymentId}>
                  {h.deployedAt.slice(0, 19)} — {h.status} — {h.dryRun ? "DRY RUN" : h.previewUrl ?? "—"}
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" className="fhis-btn fhis-btn-ghost fhis-btn-sm" onClick={handleDraft} disabled={loading}>
            Draft + Validate
          </button>
          <button type="button" className="fhis-btn fhis-btn-primary fhis-btn-sm" onClick={handleExecute} disabled={loading}>
            Execute (dry-run default)
          </button>
          <Link href="/deployments" className="fhis-btn fhis-btn-ghost fhis-btn-sm">
            Deployment History
          </Link>
        </div>

        {result && (
          <Panel>
            <SectionHeader title="Last Result" />
            <pre style={{ fontSize: "0.7rem", maxHeight: 200, overflow: "auto" }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </Panel>
        )}
      </Stack>
    </Container>
  );
}
