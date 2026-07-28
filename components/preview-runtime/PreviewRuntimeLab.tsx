"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { OsModuleFrame } from "@/components/os/OsModuleFrame";
import { PREVIEW_RUNTIME_VERSION } from "@/lib/preview-runtime/types";
import type { DockerAvailability, E2EVerificationResult, PreviewSandbox } from "@/lib/preview-runtime/types";
import { PreviewSandboxPanel } from "./PreviewSandboxPanel";
import { NEXORA_E2E_MISSION_ID } from "@/lib/creation-output/e2e-nexora-pipeline";

export function PreviewRuntimeLab() {
  const [docker, setDocker] = useState<DockerAvailability | null>(null);
  const [sandboxes, setSandboxes] = useState<PreviewSandbox[]>([]);
  const [e2e, setE2e] = useState<E2EVerificationResult | null>(null);
  const [e2eRunning, setE2eRunning] = useState(false);

  const refresh = useCallback(async () => {
    const [dRes, sRes] = await Promise.all([
      fetch("/api/preview-runtime/docker"),
      fetch("/api/preview-runtime"),
    ]);
    if (dRes.ok) setDocker(await dRes.json());
    if (sRes.ok) {
      const data = await sRes.json();
      setSandboxes(data.sandboxes ?? []);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const runE2E = async () => {
    setE2eRunning(true);
    try {
      const res = await fetch("/api/preview-runtime/e2e", { method: "POST" });
      if (res.ok) setE2e(await res.json());
    } finally {
      setE2eRunning(false);
      refresh();
    }
  };

  return (
    <OsModuleFrame title="Preview Runtime Lab" description={PREVIEW_RUNTIME_VERSION}>
      <div style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
        <Link href="/labs" style={{ fontSize: "0.8rem" }}>← Labs</Link>
        <Link href={`/studio/${NEXORA_E2E_MISSION_ID}/preview`} style={{ fontSize: "0.8rem" }}>
          Studio NEXORA Preview
        </Link>
      </div>

      <section style={{ marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 8px" }}>Docker / Isolation</h3>
        <pre style={{ fontSize: "0.8rem", background: "#0f172a", padding: 12, borderRadius: 8 }}>
          {JSON.stringify(docker, null, 2)}
        </pre>
      </section>

      <section style={{ marginBottom: 24 }}>
        <h3 style={{ margin: "0 0 8px" }}>Sandboxes activos ({sandboxes.length})</h3>
        <pre style={{ fontSize: "0.75rem", background: "#0f172a", padding: 12, borderRadius: 8, maxHeight: 200, overflow: "auto" }}>
          {JSON.stringify(sandboxes.map((s) => ({ id: s.id, status: s.status, kind: s.projectKind, port: s.port })), null, 2)}
        </pre>
      </section>

      <section style={{ marginBottom: 24 }}>
        <button type="button" onClick={runE2E} disabled={e2eRunning} style={{ padding: "8px 16px", borderRadius: 6 }}>
          {e2eRunning ? "E2E NEXORA en curso…" : "Run E2E NEXORA Verification"}
        </button>
        {e2e && (
          <pre style={{ fontSize: "0.75rem", background: "#0f172a", padding: 12, borderRadius: 8, marginTop: 12, maxHeight: 400, overflow: "auto" }}>
            {JSON.stringify(e2e, null, 2)}
          </pre>
        )}
      </section>

      <section>
        <h3 style={{ margin: "0 0 12px" }}>Quick Start — NEXORA</h3>
        <PreviewSandboxPanel missionId={NEXORA_E2E_MISSION_ID} />
      </section>
    </OsModuleFrame>
  );
}
