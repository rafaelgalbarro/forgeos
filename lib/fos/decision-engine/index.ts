import type { VentureProject } from "@/lib/domain/venture";
import { resolveTopPriority } from "../priority-engine";

export interface FosDecision {
  id: string;
  label: string;
  rationale: string;
  expectedImpact: string;
  href: string;
  confidence: number;
}

export function resolvePrimaryDecision(ventures: VentureProject[]): FosDecision {
  const priority = resolveTopPriority(ventures);
  return {
    id: "primary-decision",
    label: priority.actionLabel ?? "Crear primera empresa",
    rationale:
      ventures.length === 0
        ? "Sin ventures el sistema no puede generar valor — captura una idea."
        : "Esta acción desbloquea el mayor retorno según el estado del portfolio.",
    expectedImpact: priority.impact ?? "Inicia el pipeline ForgeOS",
    href: priority.href ?? "/",
    confidence: ventures.length > 0 ? 78 : 95,
  };
}
