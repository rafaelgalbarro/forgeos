import "server-only";

import fs from "node:fs";
import path from "node:path";

/**
 * Minimal PDF writer (no puppeteer/pdfkit) for ForgeOS Telegram report attachments.
 * Produces a valid single-page text PDF from plain UTF-8 lines (ASCII-safe escaped).
 */

export type ReportPdfSection = {
  title: string;
  lines: string[];
};

export type ReportPdfInput = {
  title: string;
  subtitle?: string;
  generatedAtIso: string;
  sections: ReportPdfSection[];
};

const PDF_DIR = path.resolve(process.cwd(), ".forgeos", "reports", "pdf");

function ensurePdfDir(): void {
  fs.mkdirSync(PDF_DIR, { recursive: true });
}

/** Escape PDF string literals (WinAnsi-ish; strip non-latin1). */
function pdfEscape(raw: string): string {
  return raw
    .replace(/[^\x20-\x7E\n]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapLines(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let cur = "";
  for (const w of words) {
    if (!cur) {
      cur = w;
      continue;
    }
    if ((cur + " " + w).length <= maxChars) {
      cur = `${cur} ${w}`;
    } else {
      out.push(cur);
      cur = w;
    }
  }
  if (cur) out.push(cur);
  return out.length ? out : [""];
}

function buildContentStream(input: ReportPdfInput): string {
  const ops: string[] = [];
  let y = 800;
  const left = 40;
  const lineH = 12;
  const maxChars = 95;

  const pushText = (text: string, size: number, bold = false) => {
    if (y < 48) return;
    const font = bold ? "/F2" : "/F1";
    for (const line of wrapLines(text, maxChars)) {
      if (y < 48) break;
      ops.push("BT");
      ops.push(`${font} ${size} Tf`);
      ops.push(`${left} ${y} Td`);
      ops.push(`(${pdfEscape(line)}) Tj`);
      ops.push("ET");
      y -= lineH + (size > 11 ? 4 : 0);
    }
  };

  pushText(input.title, 16, true);
  if (input.subtitle) pushText(input.subtitle, 10);
  pushText(`Generated: ${input.generatedAtIso}`, 9);
  pushText("Mode: ANALYSIS_ONLY — informational report", 9);
  y -= 8;

  for (const section of input.sections) {
    y -= 4;
    pushText(section.title, 12, true);
    for (const line of section.lines) {
      pushText(line || " ", 10);
    }
    y -= 6;
  }

  return ops.join("\n");
}

function assemblePdf(contentStream: string): Buffer {
  const objects: string[] = [];
  objects.push("1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n");
  objects.push("2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n");
  objects.push(
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>endobj\n",
  );
  const stream = contentStream;
  objects.push(`4 0 obj<< /Length ${Buffer.byteLength(stream, "utf8")} >>stream\n${stream}\nendstream\nendobj\n`);
  objects.push("5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n");
  objects.push("6 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>endobj\n");

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf, "utf8"));
    pdf += obj;
  }
  const xrefPos = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefPos}\n%%EOF\n`;
  return Buffer.from(pdf, "utf8");
}

export function buildReportPdfBuffer(input: ReportPdfInput): Buffer {
  return assemblePdf(buildContentStream(input));
}

export function writeReportPdfFile(input: ReportPdfInput, fileName: string): string {
  ensurePdfDir();
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const full = path.join(PDF_DIR, safe);
  fs.writeFileSync(full, buildReportPdfBuffer(input));
  return full;
}
