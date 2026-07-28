"use client";

import type { CreationOutput } from "@/lib/creation-output/types";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";

interface Props {
  output: CreationOutput;
}

export function StructurePanel({ output }: Props) {
  return (
    <Panel>
      <SectionHeader title="Estructura" subtitle={`${output.files.length} archivos · ${output.routes.length} rutas`} />
      {output.files.length > 0 && (
        <>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: 4 }}>Archivos</div>
          <ul style={{ fontSize: "0.8rem", margin: "0 0 12px", paddingLeft: 20 }}>
            {output.files.map((f) => (
              <li key={f.path}>
                {f.kind === "directory" ? "📁" : "📄"} {f.path}
                {f.description && <span style={{ color: "var(--fhis-color-text-muted)" }}> — {f.description}</span>}
              </li>
            ))}
          </ul>
        </>
      )}
      {output.routes.length > 0 && (
        <>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, marginBottom: 4 }}>Rutas</div>
          <ul style={{ fontSize: "0.8rem", margin: 0, paddingLeft: 20 }}>
            {output.routes.map((r) => (
              <li key={r.id}>{r.path} — {r.label}</li>
            ))}
          </ul>
        </>
      )}
      {output.sourceArtifacts.length > 0 && (
        <>
          <div style={{ fontSize: "0.75rem", fontWeight: 600, margin: "12px 0 4px" }}>Artefactos fuente</div>
          <ul style={{ fontSize: "0.8rem", margin: 0, paddingLeft: 20 }}>
            {output.sourceArtifacts.map((a) => (
              <li key={a.artifactId}>{a.label} ({a.type})</li>
            ))}
          </ul>
        </>
      )}
    </Panel>
  );
}
