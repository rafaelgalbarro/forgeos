import type { VentureProject } from "@/lib/domain/venture";
import { resolveNextAction } from "@/lib/portfolio/next-action";
import type { NextAction } from "@/lib/portfolio/next-action";

export function resolveWorkspaceNextActions(venture: VentureProject): NextAction[] {
  const primary = resolveNextAction(venture);
  const actions: NextAction[] = [primary];

  if (!venture.researchReport && primary.label !== "Completar Research") {
    actions.push({
      ...primary,
      label: "Completar Research",
      description: "Research pendiente para validar mercado",
      priority: "media",
    });
  }

  if (venture.productPRD && venture.status === "ready") {
    actions.push({
      ...primary,
      label: "Exportar Investor Pack",
      description: "Documentación lista para compartir",
      href: `/venture/${venture.id}/print`,
      impact: "Facilita conversaciones con inversores y partners",
      priority: "baja",
    });
  }

  return actions.slice(0, 4);
}

export { resolveNextAction };
