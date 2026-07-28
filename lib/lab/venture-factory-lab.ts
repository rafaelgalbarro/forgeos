/** Venture Factory — lab harness (RC7) */

import { VENTURE_FACTORY_STAGES, previewVenture, isVentureFactoryCommand } from "@/lib/venture-factory";

export interface VentureFactoryLabSnapshot {
  stageCount: number;
  moduleCount: number;
  demoVertical: string;
  stages: typeof VENTURE_FACTORY_STAGES;
  sampleIdeas: string[];
  dryRunOnly: boolean;
  demoPreview: ReturnType<typeof previewVenture>;
}

const DEMO_IDEA = "Crea una empresa de gafas premium";

export function runVentureFactoryLab(): VentureFactoryLabSnapshot {
  return {
    stageCount: VENTURE_FACTORY_STAGES.length,
    moduleCount: 14,
    demoVertical: "premium_eyewear",
    stages: VENTURE_FACTORY_STAGES,
    sampleIdeas: [
      DEMO_IDEA,
      "Crea una startup SaaS de gestión de flotas",
      "Nueva empresa e-commerce moda sostenible",
    ],
    dryRunOnly: true,
    demoPreview: previewVenture(DEMO_IDEA),
  };
}

export function validateVentureIdea(idea: string): { valid: boolean; hint?: string } {
  if (!idea.trim()) {
    return { valid: false, hint: "Escribe una idea para iniciar el pipeline" };
  }
  if (!isVentureFactoryCommand(idea)) {
    return { valid: false, hint: 'Prueba: "Crea una empresa de gafas premium"' };
  }
  return { valid: true };
}
