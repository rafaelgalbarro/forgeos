"use client";

import { useMemo } from "react";
import { Badge, Button, Panel, SectionHeader } from "@/components/ui/fhis";
import { createDownloadStub, formatExportManifest, generateExportBundle } from "@/lib/website-factory";
import type { ExportBundle, WebsiteProject } from "@/lib/website-factory";

interface WebsiteExportPanelProps {
  project: WebsiteProject;
}

export function WebsiteExportPanel({ project }: WebsiteExportPanelProps) {
  const bundle: ExportBundle = useMemo(
    () => project.exportBundle ?? generateExportBundle(project),
    [project]
  );
  const manifest = useMemo(() => formatExportManifest(bundle), [bundle]);
  const download = useMemo(() => createDownloadStub(bundle), [bundle]);

  const handleCopyManifest = () => {
    void navigator.clipboard?.writeText(manifest);
  };

  return (
    <Panel className="fhis-wf-export">
      <SectionHeader
        title="Export manifest"
        subtitle={`Next.js scaffold · ${bundle.files.length} archivos`}
      />
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <Badge variant="accent">{bundle.framework}</Badge>
        <Badge variant="default">v{bundle.manifestVersion}</Badge>
      </div>
      <pre
        style={{
          background: "var(--fhis-color-bg)",
          padding: "var(--fhis-space-3)",
          borderRadius: 8,
          fontSize: 12,
          maxHeight: 280,
          overflow: "auto",
          whiteSpace: "pre-wrap",
        }}
      >
        {manifest}
      </pre>
      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        <Button variant="secondary" size="sm" onClick={handleCopyManifest}>
          Copiar manifest
        </Button>
        <Button variant="primary" size="sm" disabled title={download.note}>
          Descargar {download.filename} (stub)
        </Button>
      </div>
      <p style={{ marginTop: 12, fontSize: 13, color: "var(--fhis-color-text-muted)" }}>{download.note}</p>
    </Panel>
  );
}
