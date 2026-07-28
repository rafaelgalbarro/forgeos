/** Landing generator — dry-run copy */

import type { IdeaProfile } from "../idea-context";
import type { LandingCopy } from "../types";

export function generateLanding(profile: IdeaProfile, companyName: string, valueProp: string): LandingCopy {
  if (profile.isPremiumGlasses) {
    return {
      headline: `${companyName} — Gafas premium hechas para destacar`,
      subheadline: valueProp,
      cta: "Descubre tu montura ideal",
      heroBullets: [
        "Acetato italiano de grado óptico",
        "Prueba virtual en 60 segundos",
        "Envío express 72h · Devolución 30 días",
      ],
      sections: [
        {
          title: "Diseño europeo",
          body: "Colecciones limitadas inspiradas en ateliers parisinos y milaneses.",
        },
        {
          title: "Personalización",
          body: "Elige montura, lentes y acabados. Configurador 3D integrado.",
        },
        {
          title: "Sostenibilidad",
          body: "Acetato bio-basado y packaging reciclable sin comprometer calidad.",
        },
      ],
    };
  }

  return {
    headline: `${companyName} — ${valueProp}`,
    subheadline: "La plataforma que transforma tu idea en resultados medibles",
    cta: "Empieza gratis",
    heroBullets: ["Setup en minutos", "Sin tarjeta", "Soporte en español"],
    sections: [
      { title: "Producto", body: "Funcionalidades core diseñadas para el cliente objetivo." },
      { title: "Precio", body: "Planes transparentes que escalan con tu negocio." },
      { title: "Confianza", body: "Seguridad enterprise y SLA garantizado." },
    ],
  };
}
