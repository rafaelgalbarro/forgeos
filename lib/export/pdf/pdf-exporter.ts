import type { VentureProject } from "@/lib/domain/venture";
import {
  buildPrintableDocument,
  downloadPrintableHtml,
  openPrintableInNewTab,
  triggerBrowserPrint,
} from "./html-template";
import type { PrintExportOptions, PrintableDocument } from "./types";

export { buildVenturePrintData } from "./print-sections";
export type { PrintSection, VenturePrintData } from "./print-sections";
export { PRINT_STYLES } from "./pdf-styles";
export {
  buildPrintableHtml,
  buildPrintableDocument,
  downloadPrintableHtml,
  openPrintableInNewTab,
  triggerBrowserPrint,
} from "./html-template";

export function exportVenturePDF(venture: VentureProject, options: PrintExportOptions = {}): PrintableDocument {
  const doc = buildPrintableDocument(venture);

  if (typeof window === "undefined") return doc;

  if (options.openInNewTab) {
    openPrintableInNewTab(venture);
  }

  if (options.triggerPrint) {
    if (!options.openInNewTab) {
      openPrintableInNewTab(venture);
    }
    // Print is triggered from the print page component for reliability
  }

  return doc;
}

export function downloadVenturePDFHtml(venture: VentureProject): void {
  downloadPrintableHtml(venture);
}
