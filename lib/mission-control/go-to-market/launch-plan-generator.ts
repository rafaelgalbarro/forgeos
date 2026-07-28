/** Heuristic launch plan generator from mission context. */

import type { GTMContext, LaunchPlan, LaunchPlanPhase } from "./types";

function addWeeks(from: Date, weeks: number): string {
  const d = new Date(from);
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}

export function generateLaunchPlan(ctx: GTMContext): LaunchPlan {
  const name = ctx.ventureName;
  const now = new Date();

  const phases: LaunchPlanPhase[] = [
    {
      id: "prep",
      name: "Pre-lanzamiento",
      description: `Preparar activos, mensaje y audiencia inicial para ${name}.`,
      startWeek: 1,
      endWeek: 2,
      milestones: [
        { id: "m1", title: "Definir propuesta de valor y ICP", dueWeek: 1, completed: false },
        { id: "m2", title: "Landing page y waitlist activos", dueWeek: 1, completed: false },
        { id: "m3", title: "Press kit y assets de marca listos", dueWeek: 2, completed: false },
        { id: "m4", title: "Secuencias email configuradas", dueWeek: 2, completed: false },
      ],
    },
    {
      id: "soft",
      name: "Lanzamiento suave",
      description: "Beta cerrada con early adopters y feedback iterativo.",
      startWeek: 3,
      endWeek: 4,
      milestones: [
        { id: "m5", title: "Invitar 50 beta users objetivo", dueWeek: 3, completed: false },
        { id: "m6", title: "Recoger 10 testimonios iniciales", dueWeek: 3, completed: false },
        { id: "m7", title: "Ajustar onboarding según feedback", dueWeek: 4, completed: false },
      ],
    },
    {
      id: "launch",
      name: "Lanzamiento público",
      description: `Go-live en ${ctx.industry} con campaña multicanal.`,
      startWeek: 5,
      endWeek: 6,
      milestones: [
        { id: "m8", title: "Product Hunt launch day", dueWeek: 5, completed: false },
        { id: "m9", title: "Campaña LinkedIn + email blast", dueWeek: 5, completed: false },
        { id: "m10", title: "Outreach prensa y partners", dueWeek: 6, completed: false },
      ],
    },
    {
      id: "scale",
      name: "Escalar tracción",
      description: "Optimizar conversión y retención post-launch.",
      startWeek: 7,
      endWeek: 8,
      milestones: [
        { id: "m11", title: "Analizar métricas D7/D30", dueWeek: 7, completed: false },
        { id: "m12", title: "Activar nurture y upsell", dueWeek: 8, completed: false },
      ],
    },
  ];

  return {
    summary: `Plan de lanzamiento de 8 semanas para ${name} en ${ctx.industry}. ${ctx.idea.slice(0, 120)}`,
    targetLaunchDate: addWeeks(now, 5),
    phases,
  };
}
