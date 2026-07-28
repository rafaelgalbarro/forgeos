/** Lightweight Home insight types — serializable, no engine dependencies. */

export interface HomeSummary {
  venturesCount: number;
  buildsCount: number;
  deploymentsCount: number;
  aiProvidersCount: number;
  healthStatus: number;
  ceoRecommendation: string;
  nextAction: string;
  primaryRisk: string;
  /** Venture name for CEO panel when available. */
  venturePending: string;
  /** CTA for deeper detail — always Command Center. */
  detailHref: string;
}

export const DEFAULT_HOME_SUMMARY: HomeSummary = {
  venturesCount: 0,
  buildsCount: 0,
  deploymentsCount: 0,
  aiProvidersCount: 4,
  healthStatus: 0,
  ceoRecommendation: "Sin recomendaciones pendientes",
  nextAction: "Sin recomendaciones pendientes",
  primaryRisk: "Sin riesgos críticos detectados",
  venturePending: "Sin ventures activos",
  detailHref: "/command-center",
};
