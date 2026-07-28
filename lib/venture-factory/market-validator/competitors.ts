/** Market validator — competitor analysis (dry-run) */

import type { IdeaProfile } from "../idea-context";
import type { CompetitorProfile } from "../types";

export function analyzeCompetitors(profile: IdeaProfile): CompetitorProfile[] {
  if (profile.isPremiumGlasses) {
    return [
      {
        name: "Gentle Monster",
        positioning: "Moda premium + retail experiencial",
        strengths: ["Marca global", "Diseño icónico"],
        weaknesses: ["Precio alto", "Poca personalización online"],
        priceRange: "€280–€450",
      },
      {
        name: "Moscot",
        positioning: "Heritage americano premium",
        strengths: ["Historia", "Calidad acetato"],
        weaknesses: ["Presencia digital limitada ES"],
        priceRange: "€220–€380",
      },
      {
        name: "Pretavoir",
        positioning: "Distribuidor online multimarca",
        strengths: ["Catálogo amplio", "SEO fuerte"],
        weaknesses: ["Commodity", "Sin marca propia"],
        priceRange: "€150–€320",
      },
    ];
  }

  return [
    {
      name: "Incumbent A",
      positioning: "Líder legacy del vertical",
      strengths: ["Base instalada", "Integraciones"],
      weaknesses: ["UX anticuada", "Precio enterprise"],
      priceRange: "€99–€499/mes",
    },
    {
      name: "Startup B",
      positioning: "Challenger moderno",
      strengths: ["Onboarding rápido", "API"],
      weaknesses: ["Poca madurez", "Soporte limitado"],
      priceRange: "€49–€199/mes",
    },
  ];
}
