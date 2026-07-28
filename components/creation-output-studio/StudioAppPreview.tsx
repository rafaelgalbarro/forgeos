"use client";

import { useCallback, useEffect, useState } from "react";
import type { CreationOutput, WebApplicationOutputPayload } from "@/lib/creation-output/types";
import type { PreviewApp } from "@/lib/application-factory";
import { LoadingState } from "@/components/ui/LoadingState";
import { UnavailableState } from "@/components/ui/UnavailableState";
import dynamic from "next/dynamic";

const ApplicationPreview = dynamic(
  () => import("@/components/application-factory/ApplicationPreview").then((m) => m.ApplicationPreview),
  { ssr: false, loading: () => <LoadingState title="Cargando app preview…" /> }
);

interface Props {
  projectId?: string;
  output: CreationOutput;
  onError?: (msg: string) => void;
}

export function StudioAppPreview({ projectId, output, onError }: Props) {
  const [preview, setPreview] = useState<PreviewApp | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("admin");
  const [scenario, setScenario] = useState("default");
  const [flowStep, setFlowStep] = useState(0);

  const payload = output.payload as WebApplicationOutputPayload | undefined;

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { loadApplicationPreview } = await import(
          "@/lib/creation-output/adapters/application-output-adapter"
        );
        const p = await loadApplicationPreview(projectId);
        if (!cancelled) setPreview(p);
      } catch {
        if (!cancelled) onError?.("Error cargando preview app");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId, onError]);

  const resetDemo = useCallback(() => {
    setRole("admin");
    setScenario("default");
    setFlowStep(0);
  }, []);

  const runFlow = useCallback(() => {
    const flow = payload?.demoFlows?.[0];
    if (!flow) return;
    setFlowStep((s) => (s + 1) % flow.steps.length);
  }, [payload]);

  if (loading) return <LoadingState title="Cargando aplicación demo…" />;
  if (!preview) return <UnavailableState toolName="App Preview" reason="Preview no generado." />;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ fontSize: "0.8rem" }}>
          Escenario:{" "}
          <select value={scenario} onChange={(e) => setScenario(e.target.value)} style={{ fontSize: "0.8rem" }}>
            {(payload?.scenarios ?? [{ id: "default", label: "Demo" }]).map((s) => (
              <option key={s.id} value={s.id}>{s.label}</option>
            ))}
          </select>
        </label>
        <label style={{ fontSize: "0.8rem" }}>
          Rol:{" "}
          <select value={role} onChange={(e) => setRole(e.target.value)} style={{ fontSize: "0.8rem" }}>
            {(payload?.roles ?? []).map((r) => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </label>
        <button type="button" className="fhis-btn fhis-btn-ghost fhis-btn-sm" onClick={resetDemo}>
          Reset demo
        </button>
        <button type="button" className="fhis-btn fhis-btn-ghost fhis-btn-sm" onClick={runFlow}>
          User Flow Runner
          {payload?.demoFlows?.[0] && ` (${payload.demoFlows[0].steps[flowStep]})`}
        </button>
        <span style={{ fontSize: "0.7rem", color: "var(--fhis-color-text-muted)" }}>
          {output.previewMode} · login demo
        </span>
      </div>
      <ApplicationPreview preview={preview} />
    </div>
  );
}
