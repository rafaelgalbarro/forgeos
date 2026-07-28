/** Press kit generator from venture context. */

import type { GTMContext, PressKit } from "./types";

export function generatePressKit(ctx: GTMContext): PressKit {
  return {
    companyName: ctx.ventureName,
    tagline: `${ctx.ventureName} — innovación en ${ctx.industry}`,
    companyDescription: `${ctx.ventureName} es una solución que aborda ${ctx.idea}. Operamos en el sector ${ctx.industry} con enfoque en velocidad de ejecución y resultados medibles para founders y equipos en crecimiento.`,
    founderBio: "Fundador/a con experiencia en producto, tecnología y go-to-market. Apasionado/a por construir ventures con IA y metodologías lean.",
    keyStats: [
      { label: "Sector", value: ctx.industry },
      { label: "Fase actual", value: ctx.phase },
      { label: "Tiempo al MVP", value: "4-6 semanas" },
      { label: "Mercado objetivo", value: "Early adopters B2B/B2C" },
    ],
    assets: [
      { name: "Logo principal (SVG/PNG)", type: "imagen", status: "pending" },
      { name: "Logo invertido", type: "imagen", status: "pending" },
      { name: "Screenshots producto (3x)", type: "imagen", status: "pending" },
      { name: "Foto fundador/a", type: "foto", status: "pending" },
      { name: "One-pager PDF", type: "documento", status: "pending" },
      { name: "Video demo (60s)", type: "video", status: "pending" },
    ],
    contactEmail: "press@" + ctx.ventureName.toLowerCase().replace(/\s+/g, "") + ".com",
  };
}
