/** PROGRAM 5360 — Manifest exporter (JSON + Markdown). */

import type { CodeExportManifest, CodeProject } from "../types";

export function buildExportManifest(project: CodeProject): CodeExportManifest {
  const totalBytes = project.files.reduce(
    (sum, f) => sum + (f.sizeBytes ?? f.content.length),
    0
  );

  return {
    projectId: project.projectId,
    projectName: project.name,
    slug: project.slug,
    version: project.version,
    templateId: project.templateId,
    framework: project.framework,
    fileCount: project.files.length,
    totalBytes,
    validation: project.validation?.result ?? "STATIC_VALIDATION_FAILED",
    generatedAt: project.generatedAt ?? project.updatedAt,
    files: project.files.map((f) => ({
      path: f.path,
      sizeBytes: f.sizeBytes ?? f.content.length,
      checksum: f.checksum,
      language: f.language,
    })),
    warnings: project.warnings,
    generationMode: project.generationMode,
  };
}

export function formatManifestMarkdown(manifest: CodeExportManifest): string {
  const lines = [
    `# Code Export Manifest — ${manifest.projectName}`,
    "",
    `| Field | Value |`,
    `|-------|-------|`,
    `| Project ID | ${manifest.projectId} |`,
    `| Version | ${manifest.version} |`,
    `| Template | ${manifest.templateId} |`,
    `| Framework | ${manifest.framework} |`,
    `| Files | ${manifest.fileCount} |`,
    `| Total bytes | ${manifest.totalBytes} |`,
    `| Validation | ${manifest.validation} |`,
    `| Generation | ${manifest.generationMode} |`,
    `| Generated | ${manifest.generatedAt} |`,
    "",
    "## Files",
    "",
    ...manifest.files.map((f) => `- \`${f.path}\` (${f.language}, ${f.sizeBytes} bytes, ${f.checksum})`),
  ];

  if (manifest.warnings.length > 0) {
    lines.push("", "## Warnings", "");
    for (const w of manifest.warnings) {
      lines.push(`- [${w.severity}] ${w.message}`);
    }
  }

  return lines.join("\n");
}

export function exportManifestJson(project: CodeProject): string {
  return JSON.stringify(buildExportManifest(project), null, 2);
}

export function exportManifestMarkdown(project: CodeProject): string {
  return formatManifestMarkdown(buildExportManifest(project));
}
