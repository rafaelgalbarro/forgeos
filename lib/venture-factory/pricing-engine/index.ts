/** Pricing engine — dry-run pricing model */

import type { IdeaProfile } from "../idea-context";
import type { PricingModel } from "../types";

export function generatePricing(profile: IdeaProfile): PricingModel {
  if (profile.isPremiumGlasses) {
    return {
      strategy: "D2C premium + upsell lentes + suscripción cuidado",
      currency: "EUR",
      plans: [
        { name: "Essential", price: "€189", features: ["Acetato italiano", "Antireflejante", "Estuche premium"] },
        { name: "Signature", price: "€289", features: ["Diseño exclusivo", "Blue light pro", "Ajuste personalizado"] },
        { name: "Atelier", price: "€449", features: ["Edición limitada", "Grabado láser", "Garantía 3 años"] },
      ],
      unitEconomics: "COGS ~38% · Margen bruto 62% · CAC objetivo €42",
    };
  }

  if (profile.isSaaS) {
    return {
      strategy: "Tier SaaS + usage overage",
      currency: "EUR",
      plans: [
        { name: "Starter", price: "€49/mes", features: ["5 usuarios", "Dashboard básico", "Email support"] },
        { name: "Growth", price: "€149/mes", features: ["25 usuarios", "API", "Integraciones"] },
        { name: "Scale", price: "€399/mes", features: ["Ilimitado", "SLA", "SSO"] },
      ],
      unitEconomics: "LTV/CAC objetivo 4.2x · Churn <5% anual",
    };
  }

  return {
    strategy: "Freemium → conversión premium",
    currency: "EUR",
    plans: [
      { name: "Free", price: "€0", features: ["Funciones básicas", "1 proyecto"] },
      { name: "Pro", price: "€29/mes", features: ["Ilimitado", "Soporte prioritario"] },
    ],
    unitEconomics: "Conversión free→pro 8% objetivo",
  };
}
