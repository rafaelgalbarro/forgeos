"use client";

import { useEffect, useMemo, useState } from "react";
import type { CreationOutput } from "@/lib/creation-output/types";
import { LoadingState } from "@/components/ui/LoadingState";
import { UnavailableState } from "@/components/ui/UnavailableState";
import type { WebsiteProject } from "@/lib/website-factory";
import dynamic from "next/dynamic";

const WebsitePreview = dynamic(
  () => import("@/components/website-factory/WebsitePreview").then((m) => m.WebsitePreview),
  { ssr: false, loading: () => <LoadingState title="Cargando website preview…" /> }
);

interface Props {
  projectId?: string;
  output: CreationOutput;
  onError?: (msg: string) => void;
}

export function StudioWebsitePreview({ projectId, output, onError }: Props) {
  const [project, setProject] = useState<WebsiteProject | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      onError?.("Sin projectId");
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { loadWebsiteProjectForPreview } = await import(
          "@/lib/creation-output/adapters/website-output-adapter"
        );
        const p = await loadWebsiteProjectForPreview(projectId);
        if (!cancelled) setProject(p ?? null);
      } catch {
        if (!cancelled) onError?.("Error cargando proyecto web");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId, onError]);

  const viewport = useMemo(() => output.payload as { responsiveBreakpoints?: string[] } | undefined, [output.payload]);

  if (loading) return <LoadingState title="Cargando preview web…" />;
  if (!project) return <UnavailableState toolName="Website Preview" reason="Proyecto no encontrado." />;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, fontSize: "0.75rem" }}>
        {(viewport?.responsiveBreakpoints ?? ["desktop", "tablet", "mobile"]).map((bp) => (
          <span key={bp} style={{ padding: "2px 8px", borderRadius: 4, background: "var(--fhis-color-bg-subtle)" }}>
            {bp}
          </span>
        ))}
        <span style={{ color: "var(--fhis-color-text-muted)" }}>· {output.previewMode} · sin URL real</span>
      </div>
      <WebsitePreview project={project} />
    </div>
  );
}
