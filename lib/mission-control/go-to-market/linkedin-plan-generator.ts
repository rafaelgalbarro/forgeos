/** LinkedIn post schedule generator. */

import type { GTMContext, LinkedInPost } from "./types";

export function generateLinkedInPlan(ctx: GTMContext): LinkedInPost[] {
  const audience = `Founders y decision makers en ${ctx.industry}`;

  return [
    {
      id: "li-1",
      week: 1,
      day: "Martes",
      format: "texto",
      headline: `Estoy construyendo ${ctx.ventureName}`,
      body: `${ctx.idea}\n\n¿Te suena este problema? Cuéntame en comentarios.`,
      audience,
      hashtags: ["#startup", "#founders", "#buildinpublic"],
    },
    {
      id: "li-2",
      week: 1,
      day: "Jueves",
      format: "carrusel",
      headline: "5 señales de que tu mercado está listo",
      body: `Aplicado a ${ctx.industry}:\n1. Dolor recurrente\n2. Presupuesto existente\n3. Alternativas caras\n4. Regulación favorable\n5. Timing tecnológico`,
      audience,
      hashtags: ["#gtm", "#mercado", "#validacion"],
    },
    {
      id: "li-3",
      week: 2,
      day: "Lunes",
      format: "video",
      headline: "Demo de 60 segundos",
      body: `Así resuelve ${ctx.ventureName} el problema principal. Link en primer comentario.`,
      audience: "Early adopters técnicos",
      hashtags: ["#demo", "#saas", "#producto"],
    },
    {
      id: "li-4",
      week: 2,
      day: "Miércoles",
      format: "encuesta",
      headline: "¿Cuál es tu mayor bloqueo hoy?",
      body: "Opciones: tiempo, presupuesto, conocimiento, herramientas. Quiero priorizar el roadmap.",
      audience,
      hashtags: ["#founders", "#productmarketfit"],
    },
    {
      id: "li-5",
      week: 3,
      day: "Martes",
      format: "texto",
      headline: "Beta privada — 20 plazas",
      body: `Buscamos 20 equipos en ${ctx.industry} para probar ${ctx.ventureName} antes del launch público.`,
      audience: "ICP ideal — decisores",
      hashtags: ["#beta", "#earlyaccess"],
    },
    {
      id: "li-6",
      week: 4,
      day: "Viernes",
      format: "texto",
      headline: `🚀 ${ctx.ventureName} ya está disponible`,
      body: `${ctx.idea}\n\nGracias a quienes nos acompañaron en el camino. Empieza hoy → link en comentarios.`,
      audience: "Red ampliada + ICP",
      hashtags: ["#launch", "#startup", "#goToMarket"],
    },
  ];
}
