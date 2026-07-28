import { seedMeta, slugId } from "../seed-helpers";
import type { PricingEntry } from "./types";

export const PRICING_CATALOG: PricingEntry[] = [
  {
    id: slugId("pricing", "b2c-low-ticket"),
    domain: "pricing",
    title: "B2C low ticket",
    description: "Precio accesible mensual para adopción masiva y volumen.",
    tags: ["b2c", "subscription", "freemium"],
    ...seedMeta(["marketing", "founder"]),
    strategy: "subscription",
    tiers: [
      { name: "Free", priceHint: "€0", features: ["Funcionalidad básica", "Límites de uso"] },
      { name: "Plus", priceHint: "€5–15/mes", features: ["Sin límites core", "Soporte estándar"] },
    ],
    benchmarks: ["Duolingo", "Canva", "Spotify"],
  },
  {
    id: slugId("pricing", "b2c-premium"),
    domain: "pricing",
    title: "B2C premium",
    description: "Ticket alto con propuesta de valor aspiracional o pro.",
    tags: ["b2c", "subscription"],
    ...seedMeta(["marketing"]),
    strategy: "subscription",
    tiers: [
      { name: "Pro", priceHint: "€20–50/mes", features: ["Features avanzadas", "Prioridad"] },
      { name: "Family", priceHint: "€40–80/mes", features: ["Multi-usuario", "Compartido"] },
    ],
    benchmarks: ["Headspace", "Adobe Creative Cloud"],
  },
  {
    id: slugId("pricing", "b2b-saas"),
    domain: "pricing",
    title: "B2B SaaS",
    description: "Planes por asiento o tier con trial y facturación anual.",
    tags: ["b2b", "saas", "subscription"],
    ...seedMeta(["marketing", "ceo"]),
    strategy: "subscription",
    tiers: [
      { name: "Starter", priceHint: "€29–99/mes", features: ["Hasta 5 usuarios", "Core features"] },
      { name: "Growth", priceHint: "€99–299/mes", features: ["Integraciones", "Analytics"] },
      { name: "Scale", priceHint: "Custom", features: ["SSO", "SLA", "API"] },
    ],
    benchmarks: ["Monday", "Airtable", "Notion"],
  },
  {
    id: slugId("pricing", "enterprise"),
    domain: "pricing",
    title: "Enterprise",
    description: "Contrato anual, seguridad, compliance y soporte dedicado.",
    tags: ["b2b", "saas", "erp", "crm"],
    ...seedMeta(["marketing", "legal", "ceo"]),
    strategy: "hybrid",
    tiers: [
      { name: "Enterprise", priceHint: "€15k–100k+/año", features: ["SSO/SAML", "DPA", "CSM"] },
    ],
    benchmarks: ["HubSpot Enterprise", "Salesforce", "SAP"],
  },
  {
    id: slugId("pricing", "marketplace-commission"),
    domain: "pricing",
    title: "Marketplace commission",
    description: "Take rate sobre GMV con opciones de listado destacado.",
    tags: ["marketplace", "b2c", "b2b"],
    ...seedMeta(["marketing", "founder"]),
    strategy: "usage",
    tiers: [
      { name: "Standard", priceHint: "10–20% comisión", features: ["Transacción", "Pagos"] },
      { name: "Featured", priceHint: "+€/mes supply", features: ["Visibilidad", "Analytics"] },
    ],
    benchmarks: ["Airbnb", "Uber", "Shopify"],
  },
  {
    id: slugId("pricing", "freemium-conversion"),
    domain: "pricing",
    title: "Freemium conversion",
    description: "Embudo free → paid con límites que empujan upgrade natural.",
    tags: ["freemium", "b2c", "saas"],
    ...seedMeta(["marketing", "product"]),
    strategy: "freemium",
    tiers: [
      { name: "Free", priceHint: "€0", features: ["Uso limitado", "Branding"] },
      { name: "Pro", priceHint: "€8–25/mes", features: ["Sin límites", "Export", "Soporte"] },
    ],
    benchmarks: ["Canva", "Notion", "Loom"],
  },
];
