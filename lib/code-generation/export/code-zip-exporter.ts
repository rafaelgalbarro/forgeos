/** PROGRAM 5360 — ZIP exporter (browser + Node). */

import type { CodeProject } from "../types";

export interface ZipExportResult {
  filename: string;
  blob: Blob;
  fileCount: number;
  totalBytes: number;
}

export async function exportProjectAsZip(project: CodeProject): Promise<ZipExportResult> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  let totalBytes = 0;
  for (const file of project.files) {
    if (file.content.startsWith("PLACEHOLDER_BINARY")) {
      zip.file(file.path, "placeholder");
    } else {
      zip.file(file.path, file.content);
    }
    totalBytes += file.sizeBytes ?? file.content.length;
  }

  const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  return {
    filename: `${project.slug}-v${project.version}.zip`,
    blob,
    fileCount: project.files.length,
    totalBytes,
  };
}

export async function exportProjectAsZipBuffer(project: CodeProject): Promise<Buffer> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  for (const file of project.files) {
    zip.file(file.path, file.content.startsWith("PLACEHOLDER_BINARY") ? "placeholder" : file.content);
  }

  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return Buffer.from(buffer);
}

export function isValidZipBuffer(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}
