"use client";

import { useCallback } from "react";
import type { AppProject } from "@/lib/application-factory";
import { createDownloadStub, formatExportManifest, generateExportBundle } from "@/lib/application-factory";
import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Button } from "@/components/ui/fhis/Button";
import { Badge } from "@/components/ui/fhis/Badge";
import { EmptyState } from "@/components/ui/fhis/EmptyState";

interface Props {
  project: AppProject;
}

export function ApplicationExportPanel({ project }: Props) {
  const bundle = project.exportBundle ?? (project.preview ? generateExportBundle(project) : null);

  const handleDownload = useCallback(() => {
    if (!bundle) return;
    const { filename, content } = createDownloadStub(bundle);
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [bundle]);

  if (!bundle) {
    return (
      <EmptyState
        title="Export no disponible"
        description="Completa el pipeline hasta Deploy para generar el manifest de exportación."
      />
    );
  }

  return (
    <Panel>
      <Stack gap="md">
        <SectionHeader
          title="Exportar scaffold"
          subtitle={`Next.js + Supabase — ${bundle.files.length} archivos`}
        />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Badge variant="accent">{bundle.framework}</Badge>
          <Badge variant="default">{bundle.database}</Badge>
          <Badge variant="default">v{bundle.manifestVersion}</Badge>
        </div>
        <pre
          style={{
            margin: 0,
            padding: 12,
            background: "var(--fhis-color-surface)",
            borderRadius: 6,
            fontSize: 11,
            maxHeight: 200,
            overflow: "auto",
            border: "1px solid var(--fhis-color-border)",
          }}
        >
          {formatExportManifest(bundle).slice(0, 1200)}
          {formatExportManifest(bundle).length > 1200 ? "\n…" : ""}
        </pre>
        <Button variant="primary" onClick={handleDownload}>
          Descargar manifest
        </Button>
      </Stack>
    </Panel>
  );
}
