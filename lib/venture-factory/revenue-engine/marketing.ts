/** Marketing plan generator — dry-run */

import type { IdeaProfile } from "../idea-context";
import type { MarketingPlan } from "../types";

export function generateMarketingPlan(profile: IdeaProfile, companyName: string): MarketingPlan {
  if (profile.isPremiumGlasses) {
    return {
      channels: ["Instagram", "TikTok", "Google Shopping", "Email CRM", "Influencers micro"],
      campaigns: [
        "Lanzamiento colección Signature",
        "Try-on challenge #MiLumière",
        "Retargeting carrito abandonado",
      ],
      contentCalendar: [
        "Semana 1: Teaser diseño atelier",
        "Semana 2: Behind-the-scenes acetato",
        "Semana 3: UGC clientes beta",
        "Semana 4: Oferta lanzamiento -15%",
      ],
      launchWeek: [
        "Día 1: Press kit + email waitlist",
        "Día 2: Instagram Reels colección",
        "Día 3: Live try-on con influencer",
        "Día 4: Google Ads brand",
        "Día 5: Review métricas + optimizar",
      ],
    };
  }

  return {
    channels: ["LinkedIn", "Content SEO", "Email", "Partners"],
    campaigns: [`Lanzamiento ${companyName}`, "Webinar demo", "Trial extendido"],
    contentCalendar: ["Blog semanal", "Case study", "Newsletter quincenal"],
    launchWeek: ["Anuncio producto", "Demo live", "Outreach 50 leads"],
  };
}
