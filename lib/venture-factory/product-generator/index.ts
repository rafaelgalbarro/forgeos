/** Product generator — PRD summary (dry-run) */

import type { IdeaProfile } from "../idea-context";
import type { PrdSummary } from "../types";

export function generatePrd(profile: IdeaProfile, companyName: string): PrdSummary {
  if (profile.isPremiumGlasses) {
    return {
      productName: companyName,
      vision: "Democratizar eyewear premium con experiencia D2C personalizada",
      mvpFeatures: [
        "Catálogo 12 monturas signature",
        "Configurador montura + lentes",
        "Try-on AR básico (webcam)",
        "Checkout Stripe + envío 72h",
        "Panel admin pedidos",
      ],
      userStories: [
        "Como comprador quiero probar monturas virtualmente",
        "Como comprador quiero pagar y recibir en 72h",
        "Como admin quiero gestionar stock y pedidos",
      ],
      successMetrics: ["Conversión visita→compra 2.5%", "AOV €260", "NPS >45"],
      sprint1: [
        "Landing + catálogo estático",
        "Schema productos/pedidos",
        "Checkout Stripe test mode",
        "Panel admin MVP",
        "Deploy preview Vercel",
      ],
    };
  }

  return {
    productName: companyName,
    vision: "MVP que valida propuesta de valor con el segmento objetivo",
    mvpFeatures: ["Auth", "Dashboard core", "Onboarding", "Billing básico"],
    userStories: ["Como usuario quiero registrarme y ver valor en <5 min"],
    successMetrics: ["Activación D7 40%", "Retención M1 60%"],
    sprint1: ["Auth + layout", "Dashboard v1", "API core", "Deploy preview"],
  };
}
