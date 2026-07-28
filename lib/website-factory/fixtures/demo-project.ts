/** PROGRAM 4400 — Demo project fixture. */

import type { WebsiteProject } from "../types";
import { createInitialSteps } from "../wizard";
import { createInitialBuildStatus } from "../build-status";

export const DEMO_PROJECT_ID = "demo-cafe-artesanal";

export function createDemoWebsiteProject(): WebsiteProject {
  const now = new Date().toISOString();
  const steps = createInitialSteps("preview");
  const completedSummaries: Record<string, string> = {
    idea: "Café artesanal online con suscripción mensual",
    research: "Mercado specialty coffee +15% YoY en España",
    brand: "Paleta cálida, tipografía serif, tono acogedor",
    copywriting: "Copy orientado a comunidad y origen del grano",
    seo: "Keywords: café artesanal, suscripción café, tostadores",
    "page-architecture": "Home, Shop, About, Contact",
    components: "Hero, ProductGrid, SubscriptionCTA, Testimonials",
    nextjs: "App Router + metadata dinámica",
    tailwind: "Design tokens de marca aplicados",
    shadcn: "Button, Card, Badge instalados",
    preview: "Preview HTML generado",
  };

  const patchedSteps = steps.map((s) =>
    s.status === "completed" || s.status === "active"
      ? { ...s, summary: completedSummaries[s.id] ?? s.summary, status: s.id === "preview" ? ("active" as const) : s.status }
      : s
  );

  return {
    id: DEMO_PROJECT_ID,
    name: "Café Artesanal Online",
    templateId: "ecommerce-lite",
    idea: {
      title: "Café Artesanal Online",
      description: "Tienda de café de especialidad con suscripción mensual y storytelling de origen.",
      audience: "Amantes del café specialty en España",
      goals: ["Vender suscripciones", "Construir comunidad", "SEO local"],
    },
    brand: {
      primaryColor: "#6F4E37",
      secondaryColor: "#D4A574",
      fontFamily: "Georgia",
      tone: "Acogedor y artesanal",
      tagline: "Del grano a tu taza, con alma",
    },
    pages: [
      { slug: "home", title: "Inicio", purpose: "Landing principal", sections: ["Hero", "Features", "CTA"] },
      { slug: "shop", title: "Tienda", purpose: "Catálogo de productos", sections: ["ProductGrid", "Filters"] },
      { slug: "about", title: "Nosotros", purpose: "Historia de la marca", sections: ["Story", "Team"] },
      { slug: "contact", title: "Contacto", purpose: "Formulario de contacto", sections: ["ContactForm", "Map"] },
    ],
    copyBlocks: {
      Hero: "Café de origen único, tostado artesanalmente cada semana.",
      Features: "Suscripción flexible, envío gratis, trazabilidad del grano.",
      CTA: "Únete a nuestra comunidad de coffee lovers.",
    },
    seo: {
      title: "Café Artesanal Online — Suscripción de specialty coffee",
      description: "Descubre café de especialidad con suscripción mensual. Origen trazable, tostado artesanal.",
      keywords: ["café artesanal", "suscripción café", "specialty coffee", "tostadores España"],
    },
    components: ["Hero", "ProductGrid", "SubscriptionCTA", "Testimonials", "ContactForm"],
    currentStepId: "preview",
    steps: patchedSteps,
    buildStatus: createInitialBuildStatus(DEMO_PROJECT_ID),
    exportBundle: null,
    createdAt: now,
    updatedAt: now,
  };
}
