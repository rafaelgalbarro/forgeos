"use client";

import { useMemo } from "react";
import { Badge, Panel, SectionHeader } from "@/components/ui/fhis";
import { generatePreviewSrcDoc } from "@/lib/website-factory";
import type { WebsiteProject } from "@/lib/website-factory";

interface WebsitePreviewProps {
  project: WebsiteProject;
}

export function WebsitePreview({ project }: WebsitePreviewProps) {
  const srcDoc = useMemo(() => generatePreviewSrcDoc(project), [project]);

  return (
    <Panel className="fhis-wf-preview">
      <SectionHeader
        title="Vista previa"
        subtitle={`${project.pages.length} páginas · ${project.components.length} componentes`}
      />
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        <Badge variant="accent">{project.templateId}</Badge>
        <Badge variant="default">{project.brand.tone}</Badge>
      </div>
      <div
        style={{
          border: "1px solid var(--fhis-color-line)",
          borderRadius: 8,
          overflow: "hidden",
          background: "#fff",
          minHeight: 420,
        }}
      >
        <iframe
          title={`Preview — ${project.name}`}
          srcDoc={srcDoc}
          sandbox="allow-same-origin"
          style={{ width: "100%", height: 480, border: "none" }}
        />
      </div>
    </Panel>
  );
}
