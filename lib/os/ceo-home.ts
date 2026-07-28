/** ForgeOS OS — CEO Home narrative (Director General, not chatbot). */

import type { VentureProject } from "@/lib/domain/venture";
import { buildLiveActivitySnapshot } from "@/lib/live";
import type { OsCeoHomeBlock, OsCeoHomeData } from "./types";

const FOUNDER_NAME = "Rafael";

function greeting(): string {
  const hour = new Date().getHours();
  const salute = hour < 12 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";
  return `${salute} ${FOUNDER_NAME}.`;
}

function absenceLine(ventures: VentureProject[]): string {
  const live = buildLiveActivitySnapshot(ventures);
  if (live.absenceSummary.length === 0) {
    return ventures.length === 0
      ? "Mientras estabas fuera, ForgeOS mantuvo el entorno listo para tu primera startup."
      : "Mientras estabas fuera, el portfolio siguió estable — sin novedades críticas.";
  }
  const top = live.absenceSummary[0]?.text ?? "el equipo siguió avanzando.";
  return `Mientras estabas fuera… ${top.charAt(0).toLowerCase()}${top.slice(1)}`;
}

export function buildOsCeoHomeData(ventures: VentureProject[]): OsCeoHomeData {
  const focus = ventures.find((v) => v.status === "ready") ?? ventures[0];
  const focusName = focus?.name ?? "tu primer venture";

  const blocks: OsCeoHomeBlock[] = [
    { kind: "greeting", text: greeting() },
    { kind: "absence", text: absenceLine(ventures) },
    {
      kind: "research",
      text: `Research terminó el análisis de mercado para ${focusName}.`,
    },
    {
      kind: "marketing",
      text: `Marketing encontró 3 segmentos con mayor intención de compra en ${focusName}.`,
    },
    {
      kind: "build",
      text: `Build finalizó el último artefacto de frontend para ${focusName}.`,
    },
    {
      kind: "board",
      text: "Board recomienda validar con 3 clientes esta semana antes de escalar adquisición.",
    },
    {
      kind: "today",
      text: "Hoy solo necesitas revisar prioridades, aprobar el siguiente build y una reunión de 15 minutos con CEO.",
    },
  ];

  return { founderName: FOUNDER_NAME, blocks };
}
