/** Venture health scorer — dry-run */

import type { IdeaProfile } from "../idea-context";
import type { VentureHealthScore } from "../types";

export function scoreVentureHealth(profile: IdeaProfile): VentureHealthScore {
  if (profile.isPremiumGlasses) {
    return {
      overall: 78,
      marketFit: 82,
      differentiation: 75,
      executionReadiness: 76,
      notes: [
        "Mercado premium eyewear con margen atractivo",
        "Diferenciación vía personalización + velocidad",
        "Competencia fuerte en branding — invertir en identidad",
        "MVP alcanzable en 4–6 semanas",
      ],
    };
  }

  return {
    overall: 68,
    marketFit: 70,
    differentiation: 62,
    executionReadiness: 72,
    notes: ["Validar willingness-to-pay", "Refinar ICP", "MVP scope controlado"],
  };
}
