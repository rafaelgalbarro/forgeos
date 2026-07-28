import type { VentureProject } from "@/lib/domain/venture";
import { exportBuildPlanMarkdownFromVenture } from "@/lib/build-plan";
import { buildExportFilename, exportHeader } from "./export-utils";

export function exportBuildPlanMarkdown(venture: VentureProject): string {
  const body = exportBuildPlanMarkdownFromVenture(venture);
  return exportHeader(`Build Plan — ${venture.name}`, venture) + body.replace(/^# Build Plan[^\n]*\n+/m, "");
}

export function buildBuildPlanFilename(venture: VentureProject): string {
  return buildExportFilename(venture, "build_plan");
}
