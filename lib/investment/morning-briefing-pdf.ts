/**
 * Minimal PDF writer for Morning Briefing — no external PDF deps.
 * Uses Helvetica + WinAnsiEncoding (covers Spanish ¿¡ñáéíóú).
 */

import type { MorningBriefingDocument } from "./morning-briefing.types";

function escapePdfString(raw: string): string {
  return raw.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** Map Unicode → Latin-1 / WinAnsi-compatible bytes for Helvetica. */
function toWinAnsi(input: string): string {
  const out: number[] = [];
  for (const ch of input) {
    const code = ch.codePointAt(0) ?? 63;
    if (code === 0x20ac) {
      out.push(0x80);
      continue;
    }
    if (code <= 0xff) {
      out.push(code);
      continue;
    }
    out.push(0x3f);
  }
  return Buffer.from(Uint8Array.from(out)).toString("latin1");
}

function wrapLine(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const next = current ? `${current} ${w}` : w;
    if (next.length <= maxChars) {
      current = next;
    } else {
      if (current) lines.push(current);
      if (w.length <= maxChars) {
        current = w;
      } else {
        for (let i = 0; i < w.length; i += maxChars) {
          lines.push(w.slice(i, i + maxChars));
        }
        current = "";
      }
    }
  }
  if (current) lines.push(current);
  return lines;
}

type PdfPage = { lines: string[] };

function buildPages(doc: MorningBriefingDocument): PdfPage[] {
  const pages: PdfPage[] = [];
  let lines: string[] = [];
  const maxLines = 48;

  const push = (line: string) => {
    if (lines.length >= maxLines) {
      pages.push({ lines });
      lines = [];
    }
    lines.push(line);
  };

  push("ForgeOS Investment — Morning Briefing");
  push(doc.title);
  push(doc.subtitle);
  push(`Generated: ${doc.generatedAt}`);
  push(`Briefing date (${doc.scheduleTimezone}): ${doc.briefingDate}`);
  push(`Mode: ${doc.mode} · Orders: ${doc.orderExecution}`);
  push("");

  for (const section of doc.sections) {
    push("-".repeat(42));
    push(section.title);
    push(`Q: ${section.question}`);
    push(`State: ${section.state} · Source: ${section.source}`);
    push("");
    if (section.lines.length === 0) {
      push("  * NO_DATA");
    } else {
      for (const item of section.lines) {
        const prefix = item.state === "NO_DATA" ? "  * [NO_DATA] " : "  * ";
        for (const wrapped of wrapLine(`${prefix}${item.text}`, 92)) {
          push(wrapped);
        }
      }
    }
    push("");
  }

  push("-".repeat(42));
  push(doc.note);
  if (doc.sourcesUsed.length) {
    push(`Sources: ${doc.sourcesUsed.join(", ")}`);
  }
  push("ANALYSIS_ONLY — no orders placed by this report.");

  if (lines.length) pages.push({ lines });
  return pages.length ? pages : [{ lines: ["NO_DATA"] }];
}

function pageContentStream(page: PdfPage): string {
  const ops: string[] = ["BT", "/F1 10 Tf", "50 792 Td", "14 TL"];
  let first = true;
  for (const line of page.lines) {
    const safe = escapePdfString(toWinAnsi(line));
    if (first) {
      ops.push(`(${safe}) Tj`);
      first = false;
    } else {
      ops.push("T*");
      ops.push(`(${safe}) Tj`);
    }
  }
  ops.push("ET");
  return ops.join("\n");
}

/**
 * Render Morning Briefing document to PDF bytes (PDF 1.4).
 */
export function renderMorningBriefingPdf(doc: MorningBriefingDocument): Uint8Array {
  const pages = buildPages(doc);
  // Object layout: 1=Catalog, 2=Pages, then (Page, Content)*N, then Font
  const pageObjIds: number[] = [];
  let nextId = 3;
  for (let i = 0; i < pages.length; i++) {
    pageObjIds.push(nextId);
    nextId += 2; // page + content
  }
  const fontObjectId = nextId;
  const maxId = fontObjectId;

  const byId = new Map<number, string>();
  byId.set(1, "<< /Type /Catalog /Pages 2 0 R >>");
  byId.set(
    2,
    `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`,
  );

  for (let i = 0; i < pages.length; i++) {
    const pageId = pageObjIds[i]!;
    const contentId = pageId + 1;
    const stream = pageContentStream(pages[i]!);
    byId.set(
      pageId,
      [
        "<< /Type /Page /Parent 2 0 R",
        "/MediaBox [0 0 612 792]",
        `/Contents ${contentId} 0 R`,
        `/Resources << /Font << /F1 ${fontObjectId} 0 R >> >>`,
        ">>",
      ].join(" "),
    );
    byId.set(
      contentId,
      `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`,
    );
  }
  byId.set(
    fontObjectId,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  );

  const chunks: Buffer[] = [Buffer.from("%PDF-1.4\n", "latin1")];
  const offsets: number[] = [0];
  for (let id = 1; id <= maxId; id++) {
    offsets[id] = Buffer.concat(chunks).length;
    const body = byId.get(id) ?? "<< >>";
    chunks.push(Buffer.from(`${id} 0 obj\n${body}\nendobj\n`, "latin1"));
  }

  const xrefOffset = Buffer.concat(chunks).length;
  let xref = `xref\n0 ${maxId + 1}\n0000000000 65535 f \n`;
  for (let id = 1; id <= maxId; id++) {
    xref += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  chunks.push(Buffer.from(xref, "latin1"));
  chunks.push(
    Buffer.from(
      `trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
      "latin1",
    ),
  );

  return new Uint8Array(Buffer.concat(chunks));
}

/** Plain-text body for email (mirrors PDF sections). */
export function renderMorningBriefingPlainText(doc: MorningBriefingDocument): string {
  const parts: string[] = [
    "ForgeOS Investment — Morning Briefing",
    doc.title,
    doc.subtitle,
    `Generated: ${doc.generatedAt}`,
    `Briefing date (${doc.scheduleTimezone}): ${doc.briefingDate}`,
    `Mode: ${doc.mode} · Orders: ${doc.orderExecution}`,
    "",
  ];
  for (const section of doc.sections) {
    parts.push(`## ${section.title}`);
    parts.push(`Q: ${section.question}`);
    parts.push(`State: ${section.state} · Source: ${section.source}`);
    if (!section.lines.length) {
      parts.push("- NO_DATA");
    } else {
      for (const line of section.lines) {
        parts.push(`- ${line.state === "NO_DATA" ? "[NO_DATA] " : ""}${line.text}`);
      }
    }
    parts.push("");
  }
  parts.push(doc.note);
  parts.push("ANALYSIS_ONLY — no orders placed by this report.");
  return parts.join("\n");
}

export function renderMorningBriefingHtml(doc: MorningBriefingDocument): string {
  const sections = doc.sections
    .map((s) => {
      const items =
        s.lines.length === 0
          ? "<li>NO_DATA</li>"
          : s.lines
              .map(
                (l) =>
                  `<li>${l.state === "NO_DATA" ? "<em>[NO_DATA]</em> " : ""}${escapeHtml(l.text)}</li>`,
              )
              .join("");
      return `<h2>${escapeHtml(s.title)}</h2><p><em>${escapeHtml(s.question)}</em> · ${s.state}</p><ul>${items}</ul>`;
    })
    .join("\n");
  return `<!DOCTYPE html><html><body>
<h1>ForgeOS Investment — Morning Briefing</h1>
<p>${escapeHtml(doc.subtitle)}</p>
<p>Generated: ${escapeHtml(doc.generatedAt)} · ${escapeHtml(doc.briefingDate)} (${escapeHtml(doc.scheduleTimezone)})</p>
<p><strong>ANALYSIS_ONLY</strong> — orders disabled</p>
${sections}
<p>${escapeHtml(doc.note)}</p>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
