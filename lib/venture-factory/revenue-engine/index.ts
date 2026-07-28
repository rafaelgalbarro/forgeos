/** Revenue engine — dashboard data (dry-run) */

import type { IdeaProfile } from "../idea-context";
import type { RevenueDashboardData } from "../types";

export function generateRevenueDashboard(profile: IdeaProfile): RevenueDashboardData {
  if (profile.isPremiumGlasses) {
    return {
      mrrProjection: "€28K M12 (e-commerce, no MRR clásico)",
      arrProjection: "€336K run-rate año 1",
      kpis: [
        { label: "AOV", value: "€262", trend: "+8%" },
        { label: "Conversión", value: "2.4%", trend: "+0.3pp" },
        { label: "CAC", value: "€41", trend: "-12%" },
        { label: "Repeat rate", value: "18%", trend: "+2pp" },
      ],
      funnel: [
        { stage: "Visitas", rate: "100%" },
        { stage: "Configurator", rate: "34%" },
        { stage: "Checkout", rate: "8.2%" },
        { stage: "Compra", rate: "2.4%" },
      ],
      cohortNote: "Cohorte lanzamiento: 120 pedidos objetivo mes 1",
    };
  }

  return {
    mrrProjection: "€12K M12",
    arrProjection: "€144K ARR",
    kpis: [
      { label: "MRR", value: "€12K", trend: "+15%" },
      { label: "Churn", value: "3.2%", trend: "-0.5pp" },
      { label: "LTV", value: "€1.8K", trend: "+10%" },
      { label: "CAC", value: "€320", trend: "-8%" },
    ],
    funnel: [
      { stage: "Signup", rate: "100%" },
      { stage: "Activated", rate: "42%" },
      { stage: "Paid", rate: "12%" },
    ],
    cohortNote: "Proyección conservadora — validar con beta",
  };
}
