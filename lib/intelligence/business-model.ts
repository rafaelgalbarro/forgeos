import type { BusinessModelOutput, DetectedTag } from "./types";
import { classifyIdea } from "./heuristics";

export function analyzeBusinessModel(text: string, tags: DetectedTag[]): BusinessModelOutput {
  const { isMarketplace, isB2B, isPublicAid } = classifyIdea(text);
  const isFreemium = tags.some((t) => t.id === "freemium");

  if (isPublicAid) {
    return {
      recommended: "Suscripción B2B para gestorías y asesores",
      alternatives: ["Freemium B2C + premium alerts", "Comisión por gestión tramitada"],
      revenueMechanism: "MRR por asesor + fee por expediente",
      reasoning: "Mayor willingness to pay, menor riesgo legal que B2C directo.",
    };
  }

  if (isMarketplace) {
    return {
      recommended: "SaaS para proveedores + comisión por transacción",
      alternatives: ["Comisión pura (15-20%)", "Suscripción premium para visibilidad"],
      revenueMechanism: "Take rate + SaaS recurrente del lado supply",
      reasoning: "Ingresos recurrentes desde día uno reducen dependencia del volumen de transacciones.",
    };
  }

  if (isB2B) {
    return {
      recommended: "Suscripción B2B mensual + onboarding fee",
      alternatives: ["Por usuario activo", "Tiered pricing por funcionalidades"],
      revenueMechanism: "MRR con contratos anuales",
      reasoning: "B2B tolera mayor precio y menor churn que B2C.",
    };
  }

  if (isFreemium) {
    return {
      recommended: "Freemium → Pro (€19-49/mes)",
      alternatives: ["Suscripción directa", "Pago por uso"],
      revenueMechanism: "Conversión free-to-paid 5-10%",
      reasoning: "Reduce fricción de adopción inicial en mercados B2C.",
    };
  }

  return {
    recommended: "Suscripción mensual",
    alternatives: ["Freemium", "Pago único + soporte"],
    revenueMechanism: "MRR con plan anual con descuento",
    reasoning: "Modelo predecible para validar product-market fit.",
  };
}
