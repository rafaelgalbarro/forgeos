/** User onboarding flow checklist. */

import type { GTMContext, OnboardingTask } from "./types";

export function generateOnboardingChecklist(ctx: GTMContext): OnboardingTask[] {
  const name = ctx.ventureName;

  return [
    { id: "ob-1", step: 1, title: "Pantalla de bienvenida", description: `Saludo personalizado + valor de ${name}`, owner: "Producto", completed: false },
    { id: "ob-2", step: 2, title: "Perfil básico", description: "Nombre, rol, empresa (opcional)", owner: "Producto", completed: false },
    { id: "ob-3", step: 3, title: "Objetivo principal", description: "Seleccionar use case en 1 clic", owner: "Producto", completed: false },
    { id: "ob-4", step: 4, title: "Tour guiado (3 pasos)", description: "Highlight features core", owner: "Producto", completed: false },
    { id: "ob-5", step: 5, title: "Primera acción de valor", description: "Aha moment en < 5 minutos", owner: "Producto", completed: false },
    { id: "ob-6", step: 6, title: "Email de activación D0", description: "Confirmación + link ayuda", owner: "CMO", completed: false },
    { id: "ob-7", step: 7, title: "Check-in D3", description: "Email si no completó onboarding", owner: "CMO", completed: false },
    { id: "ob-8", step: 8, title: "Métricas de activación", description: "Definir evento 'onboarding_complete'", owner: "CTO", completed: false },
    { id: "ob-9", step: 9, title: "Help center / FAQ", description: "Top 5 preguntas documentadas", owner: "Soporte", completed: false },
    { id: "ob-10", step: 10, title: "Feedback post-onboarding", description: "NPS o encuesta 1 pregunta", owner: "Producto", completed: false },
  ];
}
