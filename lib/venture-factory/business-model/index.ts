/** Business model generator — dry-run */

import type { IdeaProfile } from "../idea-context";
import type { BusinessModelCanvas } from "../types";
import { defaultCompanyName } from "../idea-context";

export function generateBusinessModel(profile: IdeaProfile, companyName?: string): BusinessModelCanvas {
  const name = companyName ?? defaultCompanyName(profile);

  if (profile.isPremiumGlasses) {
    return {
      valueProposition: `${name}: gafas premium con diseño europeo, personalización online y entrega en 72h`,
      customerSegments: ["Profesionales 28–45", "Compradores regalo", "Fashion-conscious urbanos"],
      channels: ["E-commerce D2C", "Instagram/TikTok", "Pop-ups colaborativos", "Referidos"],
      revenueStreams: ["Venta gafas", "Lentes premium", "Suscripción cuidado", "Ediciones limitadas"],
      costStructure: ["COGS acetato/lentes", "Marketing performance", "Logística", "Atención al cliente"],
      keyActivities: ["Diseño colecciones", "Producción acetato", "Try-on virtual", "Retención CRM"],
    };
  }

  return {
    valueProposition: `${name}: solución digital que acelera el time-to-value para el cliente objetivo`,
    customerSegments: ["SMB", "Equipos digitales", "Early adopters"],
    channels: ["Ventas directas", "Content marketing", "Partners"],
    revenueStreams: ["Suscripción", "Servicios profesionales", "Upsell enterprise"],
    costStructure: ["Infra cloud", "Equipo producto", "Adquisición"],
    keyActivities: ["Desarrollo producto", "Customer success", "GTM"],
  };
}
