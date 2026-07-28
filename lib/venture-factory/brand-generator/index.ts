/** Brand generator — dry-run */

import type { IdeaProfile } from "../idea-context";
import type { BrandIdentity } from "../types";

export function generateBrand(profile: IdeaProfile, companyName: string): BrandIdentity {
  if (profile.isPremiumGlasses) {
    return {
      name: companyName,
      tagline: "Luz que define tu estilo",
      tone: "Sofisticado, cálido, artesanal",
      colors: ["#1A1A2E", "#C9A96E", "#F5F0EB"],
      typography: "Playfair Display + Inter",
      logoConcept: "Monograma LO con bisel óptico dorado",
    };
  }

  return {
    name: companyName,
    tagline: "Construye más rápido",
    tone: "Profesional, claro, confiable",
    colors: ["#0F172A", "#3B82F6", "#F8FAFC"],
    typography: "Inter + JetBrains Mono",
    logoConcept: "Símbolo abstracto de crecimiento",
  };
}
