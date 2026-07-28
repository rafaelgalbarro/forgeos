/** Landing page audit checklist with scores. */

import type { GTMContext, WebsiteReviewItem } from "./types";

export function generateWebsiteReview(ctx: GTMContext): WebsiteReviewItem[] {
  const name = ctx.ventureName;

  return [
    { id: "wr-1", category: "Hero", criterion: "Propuesta de valor clara en 5 segundos", score: 7, maxScore: 10, recommendation: `Destacar "${name}" y el beneficio principal above the fold.` },
    { id: "wr-2", category: "Hero", criterion: "CTA primario visible sin scroll", score: 6, maxScore: 10, recommendation: "Botón contrastado: 'Empieza gratis' o 'Únete a la waitlist'." },
    { id: "wr-3", category: "Contenido", criterion: "Prueba social (logos, testimonios)", score: 4, maxScore: 10, recommendation: "Añadir 3 testimonios beta o logos de early adopters." },
    { id: "wr-4", category: "Contenido", criterion: "Sección problema → solución", score: 8, maxScore: 10, recommendation: `Conectar dolor de ${ctx.industry} con ${name}.` },
    { id: "wr-5", category: "SEO", criterion: "Title tag y meta description", score: 5, maxScore: 10, recommendation: "Optimizar keywords del sector + nombre producto." },
    { id: "wr-6", category: "SEO", criterion: "Open Graph / social cards", score: 6, maxScore: 10, recommendation: "Imagen OG 1200×630 con tagline." },
    { id: "wr-7", category: "Conversión", criterion: "Formulario simple (≤3 campos)", score: 7, maxScore: 10, recommendation: "Solo email + nombre; resto en onboarding." },
    { id: "wr-8", category: "Conversión", criterion: "Mobile responsive", score: 8, maxScore: 10, recommendation: "Verificar CTA y legibilidad en móvil." },
    { id: "wr-9", category: "Técnico", criterion: "Tiempo de carga < 3s", score: 7, maxScore: 10, recommendation: "Optimizar imágenes y lazy load." },
    { id: "wr-10", category: "Técnico", criterion: "Analytics y pixels instalados", score: 5, maxScore: 10, recommendation: "GA4 + evento signup configurado." },
  ];
}

export function websiteReviewScore(items: WebsiteReviewItem[]): number {
  const total = items.reduce((s, i) => s + i.score, 0);
  const max = items.reduce((s, i) => s + i.maxScore, 0);
  return max ? Math.round((total / max) * 100) : 0;
}
