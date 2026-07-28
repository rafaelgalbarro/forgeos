import type { VentureProject } from "@/lib/domain/venture";
import { formatExportDate, slugifyFilename } from "../export-utils";
import { PRINT_STYLES } from "./pdf-styles";
import { buildVenturePrintData } from "./print-sections";
import type { PrintableDocument } from "./types";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function bodyToHtml(body: string, isPending?: boolean): string {
  if (isPending || body === "*Pendiente de completar*") {
    return `<p class="pending">Pendiente de completar</p>`;
  }
  return `<div class="section-body">${escapeHtml(body)}</div>`;
}

export function buildPrintableHtml(venture: VentureProject): string {
  const data = buildVenturePrintData(venture);
  const dateLabel = formatExportDate(data.generatedAt);

  const tocItems = data.toc
    .map((item) => `<li><a href="#section-${item.id}">${item.number}. ${escapeHtml(item.title)}</a></li>`)
    .join("\n");

  const sectionsHtml = data.sections
    .map(
      (section) => `
    <section class="section" id="section-${section.id}">
      <div class="section-header">
        <span class="section-num">${String(section.number).padStart(2, "0")}</span>
        <h2>${escapeHtml(section.title)}</h2>
      </div>
      ${bodyToHtml(section.body, section.isPending)}
    </section>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(data.ventureName)} — ForgeOS Investor Pack</title>
  <style>${PRINT_STYLES}</style>
</head>
<body>
  <div class="print-doc">
    <header class="cover">
      <div class="cover-brand">ForgeOS · Investor Pack</div>
      <h1>${escapeHtml(data.ventureName)}</h1>
      <p>${escapeHtml(venture.ideaText.slice(0, 280))}${venture.ideaText.length > 280 ? "…" : ""}</p>
      <div class="cover-meta">
        <p><strong>Categoría:</strong> ${escapeHtml(data.category)}</p>
        <p><strong>Cliente objetivo:</strong> ${escapeHtml(data.targetAudience)}</p>
        <p><strong>Generado:</strong> ${escapeHtml(dateLabel)}</p>
      </div>
      <div class="cover-score">
        <span>Venture Score</span>
        <strong>${escapeHtml(data.ventureScore)}</strong>
        <p>Recomendación: ${escapeHtml(data.recommendation)} · Confianza: ${escapeHtml(data.confidence)}</p>
      </div>
    </header>

    <nav class="toc">
      <h2>Índice</h2>
      <ol>${tocItems}</ol>
    </nav>

    ${sectionsHtml}

    <footer class="footer">
      Documento generado por ForgeOS App Factory · ${escapeHtml(dateLabel)} · Venture ID ${escapeHtml(data.ventureId)}
      <br />Simulación heurística — no constituye asesoramiento financiero.
    </footer>
  </div>
</body>
</html>`;
}

export function buildPrintableDocument(venture: VentureProject): PrintableDocument {
  const slug = slugifyFilename(venture.name);
  const date = new Date().toISOString().slice(0, 10);
  return {
    title: `${venture.name} — ForgeOS`,
    html: buildPrintableHtml(venture),
    filename: `forgeos-${slug}-investor-pack-${date}.html`,
  };
}

export function downloadPrintableHtml(venture: VentureProject): void {
  if (typeof window === "undefined") return;
  const doc = buildPrintableDocument(venture);
  const blob = new Blob([doc.html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = doc.filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function openPrintableInNewTab(venture: VentureProject): void {
  if (typeof window === "undefined") return;
  const doc = buildPrintableDocument(venture);
  const blob = new Blob([doc.html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
}

export function triggerBrowserPrint(): void {
  if (typeof window === "undefined") return;
  window.print();
}
