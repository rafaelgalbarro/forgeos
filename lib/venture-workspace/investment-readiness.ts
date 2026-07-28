import type { VentureProject } from "@/lib/domain/venture";
import { sectionHasContent } from "@/lib/portfolio/venture-status";
import { resolveWorkspaceScores } from "./startup-score";
import type { InvestmentReadiness, InvestmentReadinessMetric } from "./types";

function metric(
  id: string,
  label: string,
  score: number,
  maxScore: number,
  detail: string
): InvestmentReadinessMetric {
  const ratio = score / maxScore;
  const status = ratio >= 0.8 ? "ready" : ratio >= 0.4 ? "progress" : "pending";
  return { id, label, score, maxScore, status, detail };
}

export function buildInvestmentReadiness(venture: VentureProject): InvestmentReadiness {
  const scores = resolveWorkspaceScores(venture);
  const discoveryOk = (venture.discoveryContext?.answers.length ?? 0) >= 2;
  const researchOk = !!venture.researchReport;
  const productOk = !!venture.productPRD;
  const buildOk =
    venture.status === "ready" &&
    (sectionHasContent(venture, "frontend") || sectionHasContent(venture, "backend"));
  const gtmOk = sectionHasContent(venture, "landing") || sectionHasContent(venture, "pricing");

  const metrics: InvestmentReadinessMetric[] = [
    metric(
      "validation",
      "Validación de idea",
      (discoveryOk ? 25 : 0) + (venture.intelligenceAccepted ? 15 : 0),
      40,
      discoveryOk ? "Discovery completado" : "Discovery pendiente"
    ),
    metric(
      "market",
      "Inteligencia de mercado",
      researchOk ? 20 : venture.intelligenceReport ? 8 : 0,
      20,
      researchOk ? "Research disponible" : "Research pendiente"
    ),
    metric(
      "product",
      "Definición de producto",
      productOk ? 15 : 0,
      15,
      productOk ? "PRD definido" : "PRD pendiente"
    ),
    metric(
      "execution",
      "Capacidad de ejecución",
      buildOk ? 15 : venture.status === "building" ? 8 : 0,
      15,
      buildOk ? "Build completado" : venture.status === "building" ? "Build en progreso" : "Build no iniciado"
    ),
    metric(
      "traction",
      "Preparación GTM",
      gtmOk ? 10 : 0,
      10,
      gtmOk ? "Go-to-market documentado" : "GTM pendiente"
    ),
  ];

  const totalScore = metrics.reduce((sum, m) => sum + m.score, 0);
  const maxTotal = metrics.reduce((sum, m) => sum + m.maxScore, 0);
  const overallScore = Math.round((totalScore / maxTotal) * 100);

  let overallLabel = "No listo para inversión";
  if (overallScore >= 75) overallLabel = "Listo para conversación con inversores";
  else if (overallScore >= 50) overallLabel = "En preparación — faltan piezas clave";
  else if (overallScore >= 30) overallLabel = "Etapa temprana — enfocar validación";

  if (scores.rawStartup >= 70 && overallScore < 50) {
    overallLabel = "Alto potencial — completar documentación";
  }

  return { overallScore, overallLabel, metrics };
}
