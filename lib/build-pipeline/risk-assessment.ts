/** ForgeOS Build Pipeline — risk assessment. */

import { assessSkillRisk } from "@/lib/skills-governance/risk-engine";
import type { BuildFlowDryRunResult } from "@/lib/real-build-flow/types";
import type { PipelineMode, PipelineRiskAssessment } from "./types";

export function assessPipelineRisk(
  dryRun: BuildFlowDryRunResult,
  mode: PipelineMode
): PipelineRiskAssessment {
  const deployRisk = assessSkillRisk("vercel", "deploy_software");
  const githubRisk = assessSkillRisk("github", "create_repository");
  const supabaseRisk = assessSkillRisk("supabase", "create_database");

  const factors = [
    ...deployRisk.factors,
    ...githubRisk.factors,
    ...supabaseRisk.factors,
    "Pipeline multi-proveedor (GitHub + Supabase + Vercel)",
    "Solo preview — producción bloqueada",
    mode === "dry_run" ? "Modo dry-run activo" : "Ejecución real requiere aprobación",
  ];

  const score = Math.max(deployRisk.score, githubRisk.score, supabaseRisk.score);
  const level =
    score >= 80
      ? "CRITICAL"
      : score >= 60
        ? "HIGH"
        : score >= 40
          ? "MEDIUM"
          : "LOW";

  const blocked = level === "CRITICAL" || dryRun.blockedReason !== undefined;

  return {
    level,
    score,
    factors: [...new Set(factors)],
    blocked,
    blockedReason: dryRun.blockedReason ?? (level === "CRITICAL" ? "Riesgo CRITICAL bloquea el pipeline" : undefined),
  };
}
