/** Naming generator — dry-run */

import type { IdeaProfile } from "../idea-context";
import { defaultCompanyName } from "../idea-context";

export interface NamingResult {
  primary: string;
  alternatives: string[];
  domain: string;
  rationale: string;
}

export function generateNaming(profile: IdeaProfile): NamingResult {
  if (profile.isPremiumGlasses) {
    return {
      primary: "Lumière Optics",
      alternatives: ["Óptica Aurora", "Maison Verre", "Atelier Lumen"],
      domain: "lumiereoptics.com",
      rationale: "Evoca luz y artesanía europea; memorable en ES/EN",
    };
  }

  const primary = defaultCompanyName(profile);
  return {
    primary,
    alternatives: [`${primary} Labs`, `Nova ${primary}`, `${primary} Studio`],
    domain: `${primary.toLowerCase().replace(/\s+/g, "")}.io`,
    rationale: "Nombre derivado de la idea — corto y pronunciable",
  };
}
