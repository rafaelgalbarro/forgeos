"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { CreationOutput } from "@/lib/creation-output/types";
import type { DockerAvailability, PreviewSandbox } from "@/lib/preview-runtime/types";
import { PREVIEW_RUNTIME_VERSION } from "@/lib/preview-runtime/types";
import { outputTypeToKind } from "@/lib/code-generation/kind-map";
import { PreviewIframe } from "./PreviewIframe";
import { LoadingState } from "@/components/ui/LoadingState";

const PreviewLogViewer = dynamic(
  () => import("./PreviewLogViewer").then((m) => m.PreviewLogViewer),
  { ssr: false, loading: () => <div style={{ padding: 16, fontSize: "0.8rem" }}>Cargando logs…</div> }
);

interface Props {
  missionId: string;
  output?: CreationOutput;
}

const STATUS_COLORS: Record<string, string> = {
  READY: "#22c55e",
  DEGRADED: "#fbbf24",
  FAILED: "#ef4444",
  BUILDING: "#3b82f6",
  INSTALLING: "#3b82f6",
  STARTING: "#3b82f6",
  STOPPED: "#64748b",
};

export function PreviewSandboxPanel({ missionId, output }: Props) {
  const [sandbox, setSandbox] = useState<PreviewSandbox | null>(null);
  const [docker, setDocker] = useState<DockerAvailability | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/preview-runtime/docker")
      .then((r) => r.json())
      .then(setDocker)
      .catch(() => setDocker({ available: false, strategy: "child-process", message: "Detection failed" }));
  }, []);

  const refresh = useCallback(async (id: string) => {
    const res = await fetch(`/api/preview-runtime/${id}`);
    if (res.ok) {
      const data = await res.json();
      setSandbox(data.sandbox);
    }
  }, []);

  const start = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/preview-runtime/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          missionId,
          outputId: output?.outputId,
          factoryProjectId: output?.factoryProjectId,
          projectKind: output ? outputTypeToKind(output.type) ?? undefined : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Start failed");
      setSandbox(data.sandbox);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }, [missionId, output]);

  const action = useCallback(async (act: "stop" | "restart" | "cleanup") => {
    if (!sandbox) return;
    setBusy(true);
    try {
      if (act === "cleanup") {
        await fetch(`/api/preview-runtime/${sandbox.id}?full=true`, { method: "DELETE" });
        setSandbox(null);
        return;
      }
      const res = await fetch(`/api/preview-runtime/${sandbox.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: act }),
      });
      const data = await res.json();
      if (res.ok) setSandbox(data.sandbox);
    } finally {
      setBusy(false);
    }
  }, [sandbox]);

  useEffect(() => {
    if (!sandbox?.id || sandbox.status === "STOPPED" || sandbox.status === "FAILED") return;
    const t = setInterval(() => refresh(sandbox.id), 4000);
    return () => clearInterval(t);
  }, [sandbox?.id, sandbox?.status, refresh]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: "0.75rem", color: "var(--fhis-color-text-muted)" }}>
        {PREVIEW_RUNTIME_VERSION} · Aislamiento: {docker?.strategy ?? "…"} — {docker?.message ?? ""}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={start} disabled={busy} style={{ padding: "6px 14px", borderRadius: 6, cursor: "pointer" }}>
          {busy ? "Ejecutando…" : sandbox ? "Nuevo sandbox" : "Iniciar preview sandbox"}
        </button>
        {sandbox && (
          <>
            <button type="button" onClick={() => action("restart")} disabled={busy}>Reiniciar</button>
            <button type="button" onClick={() => action("stop")} disabled={busy}>Detener</button>
            <button type="button" onClick={() => action("cleanup")} disabled={busy}>Limpiar sandbox</button>
          </>
        )}
      </div>

      {error && <div style={{ color: "#f87171", fontSize: "0.85rem" }}>{error}</div>}

      {busy && !sandbox && <LoadingState title="Preparando sandbox…" description="Install → build → start" />}

      {sandbox && (
        <>
          <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: "0.85rem" }}>
            <span style={{ color: STATUS_COLORS[sandbox.status] ?? "#94a3b8", fontWeight: 600 }}>{sandbox.status}</span>
            <span>· {sandbox.projectKind}</span>
            {sandbox.build && <span>· Build: {sandbox.build.status}</span>}
            {sandbox.previewUrl && <span>· {sandbox.previewUrl}</span>}
          </div>

          {sandbox.previewUrl && (sandbox.status === "READY" || sandbox.status === "DEGRADED") && (
            <PreviewIframe url={sandbox.previewUrl} title={`Preview ${sandbox.projectKind}`} />
          )}

          {sandbox.mobilePreviewPlan && (
            <div style={{ padding: 12, background: "var(--fhis-color-bg-subtle)", borderRadius: 8, fontSize: "0.85rem" }}>
              <strong>Mobile Preview Plan</strong>
              <p style={{ margin: "8px 0 0" }}>{sandbox.mobilePreviewPlan}</p>
              {!sandbox.expoQrSafe && <p style={{ margin: "4px 0 0", opacity: 0.7 }}>Sin QR falso — requiere Expo env real.</p>}
            </div>
          )}

          {sandbox.build?.errors && sandbox.build.errors.length > 0 && (
            <div style={{ padding: 12, background: "#1c1917", borderRadius: 8 }}>
              <strong style={{ color: "#f87171" }}>Errores ({sandbox.build.errors.length})</strong>
              <ul style={{ margin: "8px 0 0", paddingLeft: 20, fontSize: "0.8rem" }}>
                {sandbox.build.errors.slice(0, 5).map((e, i) => (
                  <li key={i}>{e.category}: {e.message.slice(0, 120)}{e.file ? ` (${e.file}:${e.line})` : ""}</li>
                ))}
              </ul>
            </div>
          )}

          {sandbox.repairPlan && (
            <div style={{ padding: 12, border: "1px solid #fbbf24", borderRadius: 8, fontSize: "0.85rem" }}>
              <strong>Repair Plan</strong> (requiere aprobación — no auto-aplica)
              <ul style={{ margin: "8px 0 0", paddingLeft: 20 }}>
                {sandbox.repairPlan.items.map((item) => (
                  <li key={item.id}>{item.cause} — {item.suggestedChange}</li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <strong style={{ fontSize: "0.85rem" }}>Logs</strong>
            <PreviewLogViewer sandboxId={sandbox.id} />
          </div>

          {sandbox.resources && (
            <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>
              Recursos: {Math.round(sandbox.resources.elapsedMs / 1000)}s elapsed
              {sandbox.limitsExceeded && " · LÍMITE EXCEDIDO"}
            </div>
          )}
        </>
      )}
    </div>
  );
}
