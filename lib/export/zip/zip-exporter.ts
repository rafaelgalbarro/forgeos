import type { VentureProject } from "@/lib/domain/venture";
import { slugifyFilename } from "../export-utils";
import { exportInvestorPackMarkdown } from "../investor-pack-exporter";
import {
  exportPRDMarkdown,
  exportProductRoadmapMarkdown,
  exportResearchMarkdown,
  exportSimulatorReportMarkdown,
} from "../markdown-exporter";
import { exportProjectBriefMarkdown } from "../project-brief-exporter";
import { exportBuildPlanMarkdown } from "../build-plan-exporter";
import type { ExportKind } from "../types";

export interface ZipBundleFile {
  filename: string;
  kind?: ExportKind;
  content?: string;
}

export const VENTURE_ZIP_FILES: ZipBundleFile[] = [
  { filename: "project-brief.md", kind: "project_brief" },
  { filename: "investor-pack.md", kind: "investor_pack" },
  { filename: "prd.md", kind: "prd" },
  { filename: "research.md", kind: "research" },
  { filename: "simulator-report.md", kind: "simulator" },
  { filename: "roadmap.md", kind: "roadmap" },
  { filename: "build-plan.md", kind: "build_plan" },
];

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function markdownForKind(venture: VentureProject, kind: ExportKind): string {
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

/** Fallback: sequential markdown downloads when ZIP library unavailable */
export async function downloadVentureZipFallback(venture: VentureProject): Promise<void> {
  for (const file of VENTURE_ZIP_FILES) {
    const content = file.kind ? markdownForKind(venture, file.kind) : file.content ?? "";
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    downloadBlob(blob, file.filename);
    await sleep(400);
  }
}

/**
 * Builds ZIP blob using JSZip when available, otherwise returns null.
 */
export async function buildVentureZipBlob(venture: VentureProject): Promise<Blob | null> {
  try {
    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();

    for (const file of VENTURE_ZIP_FILES) {
      const content = file.kind ? markdownForKind(venture, file.kind) : file.content ?? "";
      zip.file(file.filename, content);
    }

    zip.file(
      "README.txt",
      `ForgeOS Venture Package\nProyecto: ${venture.name}\nID: ${venture.id}\nGenerado: ${new Date().toISOString()}\n`
    );

    return zip.generateAsync({ type: "blob" });
  } catch {
    return null;
  }
}

export async function downloadVentureZip(venture: VentureProject): Promise<void> {
  if (typeof window === "undefined") return;

  const blob = await buildVentureZipBlob(venture);

  if (blob) {
    const slug = slugifyFilename(venture.name);
    const date = new Date().toISOString().slice(0, 10);
    downloadBlob(blob, `forgeos-${slug}-venture-package-${date}.zip`);
    return;
  }

  await downloadVentureZipFallback(venture);
}
