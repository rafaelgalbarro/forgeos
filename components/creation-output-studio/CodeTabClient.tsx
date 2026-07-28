"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { CodeFileMetadata, CodeProjectSummary, StaticValidationResult } from "@/lib/code-generation/types";
import { CODE_GENERATION_VERSION } from "@/lib/code-generation/types";
import { OsModuleFrame } from "@/components/os/OsModuleFrame";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";

const CodeExportPanel = dynamic(
  () => import("./CodeExportPanel").then((m) => m.CodeExportPanel),
  { ssr: false, loading: () => <div style={{ padding: 16 }}>Cargando export…</div> }
);

interface ProjectMeta {
  projectId: string;
  projectType: string;
  name: string;
  version: string;
  status: string;
  templateId: string;
  generationMode: string;
  files: CodeFileMetadata[];
  validation?: { result: StaticValidationResult; score: number; checks: { id: string; label: string; status: string }[] };
  warnings: { id: string; severity: string; message: string; filePath?: string }[];
}

interface Props {
  missionId: string;
  ventureSlug?: string;
  summaries: CodeProjectSummary[];
  projects: {
    project: ProjectMeta & { files: CodeFileMetadata[] };
    totalFiles: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  }[];
}

const PAGE_SIZE = 20;

export function CodeTabClient({ missionId, ventureSlug, summaries, projects: initialProjects }: Props) {
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjects[0]?.project.projectId ?? "");
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [filePage, setFilePage] = useState(1);
  const [copied, setCopied] = useState(false);

  const selectedMeta = useMemo(
    () => initialProjects.find((p) => p.project.projectId === selectedProjectId),
    [initialProjects, selectedProjectId]
  );

  const pagedFiles = useMemo(() => {
    if (!selectedMeta) return [];
    const start = (filePage - 1) * PAGE_SIZE;
    return selectedMeta.project.files.slice(start, start + PAGE_SIZE);
  }, [selectedMeta, filePage]);

  const totalFilePages = selectedMeta
    ? Math.ceil(selectedMeta.project.files.length / PAGE_SIZE)
    : 1;

  const loadFileContent = useCallback(
    async (projectId: string, filePath: string) => {
      setFileLoading(true);
      setSelectedFilePath(filePath);
      try {
        const res = await fetch(
          `/api/code-generation/${missionId}/files?projectId=${encodeURIComponent(projectId)}&path=${encodeURIComponent(filePath)}`
        );
        if (res.ok) {
          const data = (await res.json()) as { content: string };
          setFileContent(data.content);
        } else {
          setFileContent("// Error loading file content");
        }
      } catch {
        setFileContent("// Error loading file content");
      } finally {
        setFileLoading(false);
      }
    },
    [missionId]
  );

  const handleCopy = useCallback(async () => {
    if (!fileContent) return;
    await navigator.clipboard.writeText(fileContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [fileContent]);

  return (
    <OsModuleFrame
      title="Código — Real Code Generation"
      description={`${CODE_GENERATION_VERSION} — Proyectos exportables generados`}
    >
      <div style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <Link href="/mission-control" style={{ fontSize: "0.8rem" }}>← Mission Control</Link>
        <Link href={`/studio/${missionId}`} style={{ fontSize: "0.8rem" }}>← Output Studio</Link>
        {ventureSlug && (
          <Link href={`/ventures/${ventureSlug}`} style={{ fontSize: "0.8rem" }}>
            Venture {ventureSlug}
          </Link>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {summaries.map((s) => (
          <button
            key={s.projectId}
            type="button"
            onClick={() => {
              setSelectedProjectId(s.projectId);
              setSelectedFilePath(null);
              setFileContent(null);
              setFilePage(1);
            }}
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: selectedProjectId === s.projectId ? "2px solid var(--fhis-color-accent, #2563eb)" : "1px solid #ddd",
              background: selectedProjectId === s.projectId ? "#eff6ff" : "#fff",
              cursor: "pointer",
              fontSize: "0.85rem",
            }}
          >
            {s.projectType} · v{s.version} · {s.fileCount} files
          </button>
        ))}
      </div>

      {selectedMeta && (
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr 260px", gap: 16, alignItems: "start" }}>
          <Panel>
            <SectionHeader
              title="File tree"
              subtitle={`${selectedMeta.project.files.length} archivos · paginado`}
            />
            <ul style={{ listStyle: "none", margin: 0, padding: 0, fontSize: "0.8rem", maxHeight: 480, overflow: "auto" }}>
              {pagedFiles.map((f) => (
                <li key={f.path}>
                  <button
                    type="button"
                    onClick={() => loadFileContent(selectedMeta.project.projectId, f.path)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "4px 8px",
                      border: "none",
                      background: selectedFilePath === f.path ? "#eff6ff" : "transparent",
                      cursor: "pointer",
                      fontFamily: "monospace",
                      fontSize: "0.75rem",
                    }}
                  >
                    📄 {f.path}
                  </button>
                </li>
              ))}
            </ul>
            {totalFilePages > 1 && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <button type="button" disabled={filePage <= 1} onClick={() => setFilePage((p) => p - 1)}>←</button>
                <span style={{ fontSize: "0.75rem" }}>{filePage}/{totalFilePages}</span>
                <button type="button" disabled={filePage >= totalFilePages} onClick={() => setFilePage((p) => p + 1)}>→</button>
              </div>
            )}
          </Panel>

          <Panel>
            <SectionHeader
              title={selectedFilePath ?? "Selecciona un archivo"}
              subtitle={fileLoading ? "Cargando…" : "Contenido (lazy load)"}
            />
            {selectedFilePath && (
              <div style={{ marginBottom: 8, display: "flex", gap: 8 }}>
                <button type="button" onClick={handleCopy} style={{ fontSize: "0.75rem", padding: "4px 8px" }}>
                  {copied ? "✓ Copiado" : "Copiar"}
                </button>
              </div>
            )}
            <pre
              style={{
                margin: 0,
                padding: 12,
                background: "#1e1e1e",
                color: "#d4d4d4",
                borderRadius: 8,
                fontSize: "0.72rem",
                maxHeight: 520,
                overflow: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              {fileLoading ? "Loading…" : fileContent ?? "// Selecciona un archivo del árbol"}
            </pre>
          </Panel>

          <aside style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <Panel>
              <SectionHeader title="Proyecto" subtitle={selectedMeta.project.templateId} />
              <dl style={{ fontSize: "0.8rem", margin: 0 }}>
                <dt style={{ fontWeight: 600 }}>Tipo</dt><dd>{selectedMeta.project.projectType}</dd>
                <dt style={{ fontWeight: 600 }}>Framework</dt><dd>{selectedMeta.project.projectType}</dd>
                <dt style={{ fontWeight: 600 }}>Modo</dt><dd>{selectedMeta.project.generationMode}</dd>
                <dt style={{ fontWeight: 600 }}>Validación</dt>
                <dd>{selectedMeta.project.validation?.result ?? "—"}</dd>
              </dl>
            </Panel>

            {selectedMeta.project.validation && (
              <Panel>
                <SectionHeader title="Validación estática" subtitle={`Score ${selectedMeta.project.validation.score}%`} />
                <ul style={{ fontSize: "0.75rem", margin: 0, paddingLeft: 16 }}>
                  {selectedMeta.project.validation.checks.map((c) => (
                    <li key={c.id}>{c.status === "pass" ? "✓" : c.status === "fail" ? "✗" : "⚠"} {c.label}</li>
                  ))}
                </ul>
              </Panel>
            )}

            {selectedFilePath && pagedFiles.find((f) => f.path === selectedFilePath) && (
              <Panel>
                <SectionHeader title="Archivo" />
                {(() => {
                  const meta = selectedMeta.project.files.find((f) => f.path === selectedFilePath)!;
                  return (
                    <dl style={{ fontSize: "0.75rem", margin: 0 }}>
                      <dt>Language</dt><dd>{meta.language}</dd>
                      <dt>Purpose</dt><dd>{meta.purpose}</dd>
                      <dt>Origin</dt><dd>{meta.generatedBy}</dd>
                      <dt>Checksum</dt><dd style={{ fontFamily: "monospace" }}>{meta.checksum}</dd>
                      <dt>Size</dt><dd>{meta.sizeBytes} bytes</dd>
                    </dl>
                  );
                })()}
              </Panel>
            )}

            <CodeExportPanel projectId={selectedMeta.project.projectId} missionId={missionId} />
          </aside>
        </div>
      )}
    </OsModuleFrame>
  );
}
