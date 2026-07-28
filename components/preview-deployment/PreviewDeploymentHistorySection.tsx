"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { DeploymentHistoryEntry } from "@/lib/preview-deployment/types";
import { PREVIEW_DEPLOYMENT_VERSION } from "@/lib/preview-deployment";
import { Container, Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";

export function PreviewDeploymentHistorySection() {
  const [history, setHistory] = useState<DeploymentHistoryEntry[]>([]);

  useEffect(() => {
    fetch("/api/preview-deployment/snapshot")
      .then((r) => r.json())
      .then((json) => setHistory(json.history ?? []))
      .catch(() => setHistory([]));
  }, []);

  if (history.length === 0) {
    return (
      <Container>
        <Panel>
          <SectionHeader title="Preview Deployment History" subtitle={PREVIEW_DEPLOYMENT_VERSION} />
          <p style={{ fontSize: "0.85rem", color: "var(--fhis-color-text-muted)" }}>
            Sin despliegues preview registrados. Usa{" "}
            <Link href="/lab/preview-deployment">/lab/preview-deployment</Link> o Output Studio.
          </p>
        </Panel>
      </Container>
    );
  }

  return (
    <Container>
      <Panel>
        <Stack gap="md">
          <SectionHeader title="Preview Deployment History" subtitle={PREVIEW_DEPLOYMENT_VERSION} />
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", fontSize: "0.8rem", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: 8 }}>Mission</th>
                  <th style={{ textAlign: "left", padding: 8 }}>Version</th>
                  <th style={{ textAlign: "left", padding: 8 }}>Commit</th>
                  <th style={{ textAlign: "left", padding: 8 }}>Status</th>
                  <th style={{ textAlign: "left", padding: 8 }}>URL</th>
                  <th style={{ textAlign: "left", padding: 8 }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.deploymentId} style={{ borderTop: "1px solid var(--fhis-color-border)" }}>
                    <td style={{ padding: 8 }}>
                      <Link href={`/studio/${h.missionId}`}>{h.missionId.slice(0, 20)}</Link>
                    </td>
                    <td style={{ padding: 8 }}>{h.releaseVersion}</td>
                    <td style={{ padding: 8 }}>{h.commitSha?.slice(0, 12) ?? "—"}</td>
                    <td style={{ padding: 8 }}>
                      <Badge variant={h.status === "READY" ? "accent" : "amber"}>{h.status}</Badge>
                      {h.dryRun && <Badge variant="amber">DRY RUN</Badge>}
                      {h.rolledBack && <Badge variant="red">ROLLED BACK</Badge>}
                    </td>
                    <td style={{ padding: 8 }}>
                      {h.previewUrl ? (
                        <a href={h.previewUrl} target="_blank" rel="noopener noreferrer">
                          {h.previewUrl.slice(0, 30)}…
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td style={{ padding: 8 }}>{h.deployedAt.slice(0, 19)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link href="/lab/preview-deployment" style={{ fontSize: "0.8rem" }}>
            → Lab harness
          </Link>
        </Stack>
      </Panel>
    </Container>
  );
}
