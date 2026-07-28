/** Email drip sequences — welcome, launch, nurture. */

import type { EmailCampaign, GTMContext } from "./types";

export function generateEmailCampaigns(ctx: GTMContext): EmailCampaign[] {
  const name = ctx.ventureName;

  return [
    {
      id: "email-welcome",
      name: "Secuencia Bienvenida",
      type: "welcome",
      steps: [
        { id: "w1", dayOffset: 0, subject: `Bienvenido a ${name}`, preview: "Gracias por unirte", goal: "Confirmar interés" },
        { id: "w2", dayOffset: 2, subject: "La historia detrás del producto", preview: "Por qué lo construimos", goal: "Conectar emocionalmente" },
        { id: "w3", dayOffset: 5, subject: "Tu primer paso en 5 minutos", preview: "Quick start guide", goal: "Activación inicial" },
      ],
    },
    {
      id: "email-launch",
      name: "Secuencia Lanzamiento",
      type: "launch",
      steps: [
        { id: "l1", dayOffset: -3, subject: "Faltan 3 días — reserva tu acceso", preview: "Countdown al launch", goal: "Anticipación" },
        { id: "l2", dayOffset: 0, subject: `🚀 ${name} ya está live`, preview: "Empieza ahora", goal: "Conversión launch day" },
        { id: "l3", dayOffset: 1, subject: "¿Necesitas ayuda para empezar?", preview: "Estamos aquí", goal: "Soporte post-launch" },
        { id: "l4", dayOffset: 3, subject: "Casos de éxito de la beta", preview: "Prueba social", goal: "Reforzar confianza" },
      ],
    },
    {
      id: "email-nurture",
      name: "Secuencia Nutrición",
      type: "nurture",
      steps: [
        { id: "n1", dayOffset: 7, subject: `Tips para sacar más de ${name}`, preview: "Mejores prácticas", goal: "Retención" },
        { id: "n2", dayOffset: 14, subject: "Novedades del mes", preview: "Roadmap y updates", goal: "Engagement" },
        { id: "n3", dayOffset: 21, subject: "¿Te ayudamos a escalar?", preview: "Upgrade / referidos", goal: "Expansión" },
      ],
    },
  ];
}
