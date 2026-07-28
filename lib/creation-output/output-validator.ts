/** PROGRAM 5350 — Output validation (light, no heavy engines). */

import type { CreationOutput, OutputValidation } from "./types";

export function validateOutput(output: CreationOutput): OutputValidation {
  const checks: OutputValidation["checks"] = [];

  checks.push({
    id: "has-title",
    label: "Título definido",
    status: output.title?.trim() ? "pass" : "fail",
  });

  checks.push({
    id: "has-version",
    label: "Versión asignada",
    status: output.version?.trim() ? "pass" : "fail",
  });

  checks.push({
    id: "preview-safety",
    label: "Modo preview seguro",
    status:
      output.previewMode === "mock" ||
      output.previewMode === "sandbox" ||
      output.previewMode === "dry-run" ||
      output.previewMode === "preview-plan"
        ? "pass"
        : output.previewMode === "unavailable"
          ? "warn"
          : "fail",
    detail: `Modo: ${output.previewMode}`,
  });

  if (output.type === "WEBSITE_OUTPUT" || output.type === "WEB_APPLICATION_OUTPUT") {
    checks.push({
      id: "has-routes",
      label: "Rutas navegables",
      status: output.routes.length > 0 ? "pass" : "warn",
      detail: `${output.routes.length} rutas`,
    });
  }

  if (output.type === "DEPLOYMENT_OUTPUT") {
    const payload = output.payload as { deployed?: boolean; dryRun?: boolean } | undefined;
    checks.push({
      id: "no-prod-deploy",
      label: "Sin despliegue producción",
      status: !payload?.deployed || payload?.dryRun ? "pass" : "fail",
      detail: payload?.dryRun ? "DRY RUN" : payload?.deployed ? "DEPLOYED" : "NOT DEPLOYED",
    });
  }

  if (output.type === "VENTURE_OUTPUT") {
    const payload = output.payload as { executiveSummary?: string } | undefined;
    checks.push({
      id: "venture-summary",
      label: "Resumen ejecutivo",
      status: payload?.executiveSummary?.trim() ? "pass" : "warn",
    });
  }

  const failCount = checks.filter((c) => c.status === "fail").length;
  const warnCount = checks.filter((c) => c.status === "warn").length;
  const passCount = checks.filter((c) => c.status === "pass").length;
  const score = Math.round((passCount / checks.length) * 100) - warnCount * 5;

  return {
    score: Math.max(0, Math.min(100, score)),
    passed: failCount === 0,
    checks,
    source: "heuristic",
  };
}

export function applyValidation(output: CreationOutput): CreationOutput {
  const validation = validateOutput(output);
  const status =
    validation.passed && validation.score >= 70
      ? output.status === "DRAFT"
        ? "PREVIEW_READY"
        : output.status
      : output.status === "APPROVED"
        ? output.status
        : "VALIDATING";

  return {
    ...output,
    validation,
    status: validation.passed ? status : "VALIDATING",
    updatedAt: new Date().toISOString(),
  };
}
