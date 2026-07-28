/** Program 6000 — Plan definitions and feature matrix */

import type { CommercialPlan, FeatureMatrixRow } from "./types";

export const COMMERCIAL_PLANS: CommercialPlan[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Para explorar ForgeOS y tu primera venture.",
    monthlyPrice: 0,
    annualPrice: 0,
    currency: "EUR",
    seats: 1,
    cta: "Empezar gratis",
    features: [
      "1 venture activa",
      "AI discovery básico",
      "Venture Factory (dry-run)",
      "Docs y comunidad",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Para fundadores que construyen ventures reales.",
    monthlyPrice: 49,
    annualPrice: 470,
    currency: "EUR",
    seats: 5,
    highlighted: true,
    badge: "Más popular",
    cta: "Probar Pro",
    features: [
      "5 ventures activas",
      "Venture Intelligence completo",
      "Founder dashboard + journey",
      "Live AI operations",
      "Soporte prioritario",
    ],
  },
  {
    id: "business",
    name: "Business",
    tagline: "Para equipos que escalan portfolios de ventures.",
    monthlyPrice: 149,
    annualPrice: 1430,
    currency: "EUR",
    seats: 25,
    cta: "Solicitar Business",
    features: [
      "Ventures ilimitadas",
      "Autonomous organization",
      "API keys + webhooks",
      "Marketplace + store",
      "Account manager",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Seguridad, cumplimiento y despliegue a medida.",
    monthlyPrice: 499,
    annualPrice: 4790,
    currency: "EUR",
    seats: 999,
    cta: "Contactar ventas",
    features: [
      "Asientos ilimitados",
      "SSO / SCIM",
      "GDPR + SOC2 ready",
      "Security Center",
      "SLA y soporte dedicado",
    ],
  },
];

export const FEATURE_MATRIX: FeatureMatrixRow[] = [
  { feature: "Ventures activas", starter: "1", pro: "5", business: "Ilimitadas", enterprise: "Ilimitadas" },
  { feature: "Asientos", starter: "1", pro: "5", business: "25", enterprise: "Ilimitados" },
  { feature: "Venture Factory", starter: true, pro: true, business: true, enterprise: true },
  { feature: "Live AI", starter: false, pro: true, business: true, enterprise: true },
  { feature: "API keys", starter: false, pro: false, business: true, enterprise: true },
  { feature: "Webhooks", starter: false, pro: false, business: true, enterprise: true },
  { feature: "SSO / SCIM", starter: false, pro: false, business: false, enterprise: true },
  { feature: "GDPR / SOC2", starter: false, pro: false, business: "Parcial", enterprise: true },
  { feature: "Soporte", starter: "Comunidad", pro: "Email", business: "Prioritario", enterprise: "Dedicado" },
];

export function getPlan(planId: string): CommercialPlan | undefined {
  return COMMERCIAL_PLANS.find((p) => p.id === planId);
}

export function listPlans(): CommercialPlan[] {
  return COMMERCIAL_PLANS;
}

export function getFeatureMatrix(): FeatureMatrixRow[] {
  return FEATURE_MATRIX;
}

export function formatPlanPrice(plan: CommercialPlan, interval: "monthly" | "annual" = "monthly"): string {
  const amount = interval === "annual" ? plan.annualPrice : plan.monthlyPrice;
  if (amount === 0) return "Gratis";
  const suffix = interval === "annual" ? "/año" : "/mes";
  return `€${amount}${suffix}`;
}
