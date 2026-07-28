/** Market validator — market analysis (dry-run) */

import type { IdeaProfile } from "../idea-context";
import type { MarketAnalysis } from "../types";

export { analyzeCompetitors } from "./competitors";

export function validateMarket(profile: IdeaProfile): MarketAnalysis {
  if (profile.isPremiumGlasses) {
    return {
      tam: "€4.8B — mercado global eyewear premium",
      sam: "€620M — Europa occidental D2C premium",
      som: "€18M — España + Portugal año 3",
      segments: ["Profesionales urbanos 28–45", "Early adopters diseño", "Compradores regalo premium"],
      trends: ["Personalización 3D", "Sostenibilidad acetato bio", "Try-on virtual AR"],
      geography: "España → UE (fase 2)",
    };
  }

  if (profile.isSaaS) {
    return {
      tam: "€2.1B — software B2B vertical",
      sam: "€340M — pymes Europa",
      som: "€12M — nicho objetivo año 2",
      segments: ["Pymes 10–200 empleados", "Equipos operaciones", "CTO / COO"],
      trends: ["IA copilots", "Integración API-first", "Usage-based pricing"],
      geography: "España → LATAM",
    };
  }

  return {
    tam: "€1.2B — mercado objetivo estimado",
    sam: "€180M — segmento direccionable",
    som: "€6M — captura realista 36 meses",
    segments: ["Early adopters", "Cliente premium", "SMB"],
    trends: ["Digitalización", "Experiencia omnicanal", "Datos first-party"],
    geography: "España",
  };
}
