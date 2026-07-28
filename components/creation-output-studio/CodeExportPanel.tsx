"use client";

import { useState } from "react";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";

interface Props {
  projectId: string;
  missionId: string;
}

export function CodeExportPanel({ projectId, missionId }: Props) {
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState("");

  async function handleZipExport() {
    setExporting(true);
    setMessage("");
    try {
      const res = await fetch(
        `/api/code-generation/${missionId}/export?projectId=${encodeURIComponent(projectId)}&format=zip`
      );
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `project-${projectId}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage("ZIP descargado");
    } catch {
      setMessage("Error al exportar");
    } finally {
      setExporting(false);
    }
  }

  async function handleManifestExport() {
    setExporting(true);
    try {
      const res = await fetch(
        `/api/code-generation/${missionId}/export?projectId=${encodeURIComponent(projectId)}&format=manifest`
      );
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `manifest-${projectId}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage("Manifest descargado");
    } catch {
      setMessage("Error al exportar manifest");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Panel>
      <SectionHeader title="Export" subtitle="ZIP + manifest (no git push)" />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <button type="button" disabled={exporting} onClick={handleZipExport} style={{ fontSize: "0.8rem", padding: "6px 10px" }}>
          Descargar ZIP
        </button>
        <button type="button" disabled={exporting} onClick={handleManifestExport} style={{ fontSize: "0.8rem", padding: "6px 10px" }}>
          Descargar manifest JSON
        </button>
        {message && <span style={{ fontSize: "0.75rem", color: "var(--fhis-color-text-muted)" }}>{message}</span>}
      </div>
    </Panel>
  );
}
