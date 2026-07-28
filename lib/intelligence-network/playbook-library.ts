/** Program 9000 — Playbook catalog. */

import type { PlaybookEntry } from "./types";
import type { NetworkContext } from "@/lib/network/types";
import { DEMO_DISCLAIMER } from "@/lib/network/types";

export function buildPlaybookLibrary(ctx: NetworkContext): PlaybookEntry[] {
  return [
    {
      id: "pb-pricing-ladder",
      title: "Escalera de pricing SaaS",
      summary: "Estructura Starter / Pro / Enterprise con ancla de valor en Pro.",
      category: "pricing",
      steps: [
        "Auditar planes actuales vs benchmark sector",
        "Definir plan Pro como ancla (45–59 €/mes)",
        "A/B test de conversión 4 semanas",
        "Medir ARPU y churn por tier",
      ],
      adoptionRatePct: 58,
      disclaimer: DEMO_DISCLAIMER,
    },
    {
      id: "pb-activation-7d",
      title: "Activación en 7 días",
      summary: "Onboarding guiado para time-to-value < 7 días.",
      category: "product",
      steps: [
        "Definir momento aha del producto",
        "Checklist de activación día 1–7",
        "Emails transaccionales de progreso",
        "Métrica: % usuarios activados en semana 1",
      ],
      adoptionRatePct: 67,
      disclaimer: DEMO_DISCLAIMER,
    },
    {
      id: "pb-expansion-revenue",
      title: "Expansión de revenue por cuenta",
      summary: `Playbook de upsell para ventures ${ctx.sector}.`,
      category: "growth",
      steps: [
        "Identificar cuentas con uso > 80% del plan",
        "Oferta de upgrade con valor claro",
        "Seguimiento NPS post-upgrade",
        "Target: +15% expansion MRR en 90 días",
      ],
      adoptionRatePct: 44,
      disclaimer: DEMO_DISCLAIMER,
    },
    {
      id: "pb-churn-rescue",
      title: "Rescate de churn en tier entry",
      summary: "Intervención proactiva antes del cancel.",
      category: "retention",
      steps: [
        "Alertas de bajo uso 14 días antes de renovación",
        "Oferta de plan intermedio o pausa",
        "Entrevista de salida si cancela",
        "Loop de aprendizaje al roadmap",
      ],
      adoptionRatePct: 52,
      disclaimer: DEMO_DISCLAIMER,
    },
  ];
}

export function getPlaybookById(
  playbooks: PlaybookEntry[],
  id: string
): PlaybookEntry | undefined {
  return playbooks.find((p) => p.id === id);
}

export function filterPlaybooksByCategory(
  playbooks: PlaybookEntry[],
  category: string
): PlaybookEntry[] {
  return playbooks.filter((p) => p.category === category);
}
