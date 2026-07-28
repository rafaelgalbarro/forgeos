/** ForgeOS Build Pipeline — build report generator. */

import type { BuildFlowDryRunResult, BuildFlowExecuteResult } from "@/lib/real-build-flow/types";
import type { BuildReportSummary, PipelineMode, PipelineStage } from "./types";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
}

export function generateBuildReport(params: {
  dryRun: BuildFlowDryRunResult;
  stages: PipelineStage[];
  mode: PipelineMode;
  executeResult?: BuildFlowExecuteResult;
}): BuildReportSummary {
  const { dryRun, stages, mode, executeResult } = params;
  const completed = stages.filter((s) => s.status === "completed").length;
  const repoSlug = slugify(dryRun.venture.name);

  return {
    reportId: `br-${dryRun.flowId}`,
    flowId: dryRun.flowId,
    ventureId: dryRun.venture.id,
    ventureName: dryRun.venture.name,
    success: executeResult?.success ?? completed === stages.length,
    mode,
    stagesCompleted: completed,
    stagesTotal: stages.length,
    previewUrl: executeResult?.previewUrl ?? `https://${repoSlug}-preview.vercel.app`,
    repoUrl: executeResult?.repoUrl ?? `https://github.com/forgeos/${repoSlug}`,
    riskLevel: dryRun.riskLevel,
    approvalRequired: dryRun.approvalRequired,
    realExecutionEnabled: dryRun.realExecutionEnabled,
    generatedAt: new Date().toISOString(),
  };
}
