/** PROGRAM 5370 — Auto-repair plan (no auto-apply). */

import type { RepairPlan, RepairPlanItem, PreviewParsedError } from "./types";
import { groupErrorsByCategory } from "./error-normalizer";

function generateId(): string {
  return `rp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function generateRepairPlan(
  sandboxId: string,
  missionId: string,
  errors: PreviewParsedError[],
  outputId?: string
): RepairPlan | null {
  if (errors.length === 0) return null;

  const grouped = groupErrorsByCategory(errors);
  const items: RepairPlanItem[] = [];

  for (const [category, errs] of Object.entries(grouped)) {
    const affectedFiles = [...new Set(errs.map((e) => e.file).filter(Boolean) as string[])];
    items.push({
      id: `rpi-${category}-${Date.now()}`,
      cause: `${category}: ${errs[0]?.message.slice(0, 120) ?? "Unknown error"}`,
      affectedFiles,
      suggestedChange: suggestFix(category, errs[0]),
      risk: category === "security" || category === "dependency" ? "high" : category === "typescript" ? "medium" : "low",
      approvalRequired: true,
    });
  }

  return {
    id: generateId(),
    sandboxId,
    missionId,
    outputId,
    createdAt: new Date().toISOString(),
    items,
    autoApply: false,
  };
}

function suggestFix(category: string, error?: PreviewParsedError): string {
  switch (category) {
    case "dependency":
      return "Revisar package.json — actualizar versiones o eliminar dependencia conflictiva. Requiere aprobación.";
    case "typescript":
      return error?.file
        ? `Corregir tipos en ${error.file}${error.line ? `:${error.line}` : ""}`
        : "Corregir errores TypeScript en archivos afectados";
    case "import":
      return "Verificar rutas de importación y archivos faltantes en el scaffold generado";
    case "syntax":
      return "Corregir sintaxis en el archivo indicado";
    case "route":
      return "Añadir o corregir ruta en app/ directory";
    case "security":
      return "Revisar comando o dependencia bloqueada por política de sandbox";
    default:
      return "Revisar logs de build y aplicar corrección manual con aprobación";
  }
}

export async function linkRepairPlanToChangeRequest(
  plan: RepairPlan,
  outputId: string
): Promise<RepairPlan> {
  try {
    const { getOutputRepository } = await import("@/lib/creation-output/output-repository");
    const { createChangeRequest } = await import("@/lib/creation-output/change-requests");
    const repo = getOutputRepository();
    const output = repo.findById(outputId);
    if (!output) return plan;

    const description = plan.items.map((i) => i.cause).join("; ");
    const affectedAreas = [...new Set(plan.items.flatMap((i) => i.affectedFiles))];
    const { changeRequest } = createChangeRequest(output, `[Repair Plan] ${description}`, affectedAreas);
    return { ...plan, changeRequestId: changeRequest.id };
  } catch {
    return plan;
  }
}
