/** Program 7000 — Video tutorial placeholders */

import type { VideoTutorial } from "./types";

export const VIDEO_TUTORIALS: VideoTutorial[] = [
  {
    id: "intro-forgeos",
    title: "Introducción a ForgeOS 1.0",
    duration: "4:30",
    summary: "Visión general del workspace, ventures y flujos principales.",
    href: "/demo",
    comingSoon: true,
  },
  {
    id: "venture-factory",
    title: "Tu primera venture con Venture Factory",
    duration: "8:15",
    summary: "Pipeline completo: idea → brand → landing → launch.",
    href: "/demo",
    comingSoon: true,
  },
  {
    id: "founder-journey",
    title: "Founder Journey paso a paso",
    duration: "6:00",
    summary: "Recorrido guiado por fases de la venture.",
    href: "/founder-journey",
    comingSoon: true,
  },
  {
    id: "pricing-plans",
    title: "Elegir el plan adecuado",
    duration: "3:45",
    summary: "Starter, Pro, Business y Enterprise — comparativa práctica.",
    href: "/pricing",
    comingSoon: true,
  },
  {
    id: "api-integration",
    title: "Integración con API pública",
    duration: "10:20",
    summary: "Claves API, webhooks y endpoints comerciales.",
    href: "/docs",
    comingSoon: true,
  },
];

export function listVideoTutorials(): VideoTutorial[] {
  return VIDEO_TUTORIALS;
}
