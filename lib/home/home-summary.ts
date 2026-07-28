/** Lightweight Home summary — ventures store + static metadata only. */

import type { VentureProject } from "@/lib/domain/venture";
import { getVentures } from "@/lib/store/ventures";
import {
  DEFAULT_HOME_SUMMARY,
  type HomeSummary,
} from "./home-summary-types";

/** Official AI provider count — static registry metadata (no build-registry import). */
const OFFICIAL_AI_PROVIDER_COUNT = 4;

/** Demo fallback when store is empty (SSR / first visit). */
const DEMO_VENTURE_NAME = "VANDL";

function countBuilds(ventures: VentureProject[]): number {
  return ventures.filter(
    (v) => v.status === "building" || v.status === "ready" || !!v.productPRD
  ).length;
}

function computeHealthStatus(ventures: VentureProject[]): number {
  if (ventures.length === 0) return 0;
  const healthy = ventures.filter(
    (v) => v.status === "ready" || v.status === "building"
  ).length;
  return Math.round((healthy / ventures.length) * 100);
}

function resolveCeoCopy(ventures: VentureProject[]): Pick<
  HomeSummary,
  "ceoRecommendation" | "nextAction" | "primaryRisk" | "venturePending"
> {
  if (ventures.length === 0) {
    return {
      venturePending: DEFAULT_HOME_SUMMARY.venturePending,
      ceoRecommendation: "Captura tu primera idea para activar el portfolio.",
      nextAction: "Crear una empresa desde el panel principal.",
      primaryRisk: "Portfolio vacío — sin exposición operativa.",
    };
  }

  const focus = ventures[0];
  const name = focus.name || DEMO_VENTURE_NAME;

  if (focus.status === "building") {
    return {
      venturePending: name,
      ceoRecommendation: `Prioriza completar el build de ${name}.`,
      nextAction: "Revisar progreso del venture en curso.",
      primaryRisk: "Build incompleto — validar gates antes de deploy.",
    };
  }

  if (focus.status === "ready") {
    return {
      venturePending: name,
      ceoRecommendation: `${name} está listo — evalúa el siguiente hito de lanzamiento.`,
      nextAction: "Abrir Command Center para desplegar o iterar.",
      primaryRisk: "Retraso en go-to-market si no se activa el deploy.",
    };
  }

  return {
    venturePending: name,
    ceoRecommendation: `Completa research y producto para ${name}.`,
    nextAction: "Avanzar discovery e intelligence del venture.",
    primaryRisk: "Contexto insuficiente para decisiones ejecutivas.",
  };
}

/** Build a serializable Home summary without heavy engines. */
export function loadHomeSummary(ventures?: VentureProject[]): HomeSummary {
  const list = ventures ?? getVentures();
  const ceo = resolveCeoCopy(list);

  return {
    venturesCount: list.length,
    buildsCount: countBuilds(list),
    deploymentsCount: list.some((v) => v.status === "ready") ? 1 : 0,
    aiProvidersCount: OFFICIAL_AI_PROVIDER_COUNT,
    healthStatus: computeHealthStatus(list),
    ceoRecommendation: ceo.ceoRecommendation,
    nextAction: ceo.nextAction,
    primaryRisk: ceo.primaryRisk,
    venturePending: ceo.venturePending,
    detailHref: "/command-center",
  };
}
