import type { VentureProject } from "@/lib/domain/venture";
import { exportInvestorPackMarkdown } from "./investor-pack-exporter";
import {
  exportPRDMarkdown,
  exportProductRoadmapMarkdown,
  exportResearchMarkdown,
  exportSimulatorReportMarkdown,
} from "./markdown-exporter";
import { exportProjectBriefMarkdown } from "./project-brief-exporter";
import { exportBuildPlanMarkdown } from "./build-plan-exporter";
import { buildExportFilename, downloadMarkdownFile } from "./export-utils";
import type { ExportDocument, ExportKind } from "./types";

export type {
  ExportFormat,
  ExportKind,
  ExportDocument,
  ExportKindMeta,
  VentureExportInput,
} from "./types";

export { EXPORT_KINDS_UI } from "./types";
export {
  PENDING,
  buildExportFilename,
  downloadMarkdownFile,
  getSectionContent,
  slugifyFilename,
} from "./export-utils";
export {
  buildPrintableHtml,
  buildPrintableDocument,
  buildVenturePrintData,
  downloadPrintableHtml,
  downloadVenturePDFHtml,
  exportVenturePDF,
  openPrintableInNewTab,
  triggerBrowserPrint,
} from "./pdf";
export { downloadVentureZip, buildVentureZipBlob, VENTURE_ZIP_FILES } from "./zip";
export { exportBuildPlanMarkdown } from "./build-plan-exporter";
export { exportInvestorPackMarkdown, exportInvestorPackAnnexes } from "./investor-pack-exporter";
export {
  exportPRDMarkdown,
  exportResearchMarkdown,
  exportSimulatorReportMarkdown,
  exportProductRoadmapMarkdown,
} from "./markdown-exporter";

const EXPORT_TITLES: Record<ExportKind, string> = {
  project_brief: "Project Brief",
  investor_pack: "Investor Pack",
  prd: "PRD",
  research: "Research Report",
  simulator: "Venture Simulator Report",
  roadmap: "Product Roadmap",
  build_plan: "Build Plan",
};

function buildContent(venture: VentureProject, kind: ExportKind): string {
  switch (kind) {
    case "project_brief":
      return exportProjectBriefMarkdown(venture);
    case "investor_pack":
      return exportInvestorPackMarkdown(venture);
    case "prd":
      return exportPRDMarkdown(venture);
    case "research":
      return exportResearchMarkdown(venture);
    case "simulator":
      return exportSimulatorReportMarkdown(venture);
    case "roadmap":
      return exportProductRoadmapMarkdown(venture);
    case "build_plan":
      return exportBuildPlanMarkdown(venture);
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function exportVentureMarkdown(venture: VentureProject, kind: ExportKind): ExportDocument {
  return {
    kind,
    format: "markdown",
    filename: buildExportFilename(venture, kind),
    title: EXPORT_TITLES[kind],
    content: buildContent(venture, kind),
  };
}

export function downloadVentureExport(venture: VentureProject, kind: ExportKind): void {
  const doc = exportVentureMarkdown(venture, kind);
  downloadMarkdownFile(doc.content, doc.filename);
}
