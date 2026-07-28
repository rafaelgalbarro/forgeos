import { seedMeta, slugId } from "../seed-helpers";
import type { CompetitorEntry } from "./types";

function competitor(
  name: string,
  category: string,
  description: string,
  tags: string[],
  strengths: string[],
  weaknesses: string[],
  pricingNotes: string
): CompetitorEntry {
  return {
    id: slugId("competitor", name),
    domain: "competitors",
    title: name,
    description,
    tags,
    ...seedMeta(["research", "founder", "ceo", "marketing"]),
    category,
    strengths,
    weaknesses,
    pricingNotes,
  };
}

export const COMPETITOR_CATALOG: CompetitorEntry[] = [
  competitor("Lovable", "AI app builder", "Generación de apps con IA y despliegue rápido.", ["ai", "web", "saas"], ["Velocidad de prototipo", "UX moderna"], ["Menos control enterprise", "Lock-in de stack"], "Suscripción mensual por proyecto"),
  competitor("Bolt", "AI app builder", "Construcción full-stack asistida por IA en el navegador.", ["ai", "web"], ["Time-to-market extremo", "Integraciones rápidas"], ["Escalabilidad a validar", "Código opaco"], "Freemium + créditos"),
  competitor("Replit", "Dev platform", "IDE cloud con agentes y hosting integrado.", ["ai", "web", "api"], ["Colaboración", "Deploy instantáneo"], ["No es venture studio", "Orientado a devs"], "Free + Replit Core"),
  competitor("Cursor", "AI IDE", "Editor con agentes de código y contexto de repo.", ["ai", "saas"], ["Productividad dev", "Integración IDE"], ["No genera negocio completo", "Nicho developers"], "Suscripción Pro"),
  competitor("Notion", "Productivity SaaS", "Docs, wikis y bases de datos colaborativas.", ["saas", "b2b", "b2c"], ["Flexibilidad", "Adopción viral"], ["No es vertical", "Performance en DB grandes"], "Free + Plus + Business"),
  competitor("Airtable", "No-code database", "Bases relacionales con vistas y automatizaciones.", ["saas", "b2b", "dashboard"], ["Citizen developers", "Integraciones"], ["Complejidad al escalar", "Precio por seat"], "Free + Team + Business"),
  competitor("Monday", "Work OS", "Gestión de trabajo visual para equipos.", ["saas", "b2b", "crm"], ["Adopción rápida", "Templates"], ["Commodity en PM tools", "Precio"], "Por asiento mensual"),
  competitor("Shopify", "E-commerce platform", "Tiendas online y checkout para merchants.", ["marketplace", "saas", "b2b"], ["Ecosistema apps", "Pagos integrados"], ["Comisiones", "No sirve para todo vertical"], "% transacción + plan mensual"),
  competitor("Stripe", "Payments infra", "API de pagos, billing y fiscalidad.", ["api", "saas", "b2b"], ["DX excelente", "Escala global"], ["No es producto final", "Dependencia"], "Pay-as-you-go"),
  competitor("Airbnb", "Marketplace travel", "Marketplace global de alojamientos.", ["marketplace", "b2c"], ["Liquidez", "Marca"], ["Regulación", "Take rate alto"], "Comisión host/guest"),
  competitor("Uber", "Marketplace mobility", "Matching tiempo real conductores-usuarios.", ["marketplace", "mobile", "b2c"], ["Escala", "UX de reserva"], ["Unit economics", "Regulación"], "Comisión por viaje"),
  competitor("Duolingo", "EdTech B2C", "Aprendizaje gamificado con freemium.", ["b2c", "mobile", "freemium"], ["Retención gamificada", "Marca"], ["Monetización agresiva", "Churn"], "Free + Super Duolingo"),
  competitor("Canva", "Design SaaS", "Diseño colaborativo con templates y freemium.", ["b2c", "b2b", "freemium", "saas"], ["PLG", "Templates"], ["Commoditización", "Enterprise sales"], "Free + Pro + Teams"),
  competitor("Slack", "Team comms", "Comunicación async para equipos con integraciones.", ["saas", "b2b"], ["Integraciones", "Hábito diario"], ["Competencia Microsoft", "Ruido/notificaciones"], "Free + Pro + Business+"),
  competitor("HubSpot", "CRM / GTM", "CRM, marketing y ventas para pymes y mid-market.", ["crm", "saas", "b2b"], ["Suite integrada", "Inbound"], ["Precio al escalar", "Curva de aprendizaje"], "Free CRM + hubs de pago"),
];
