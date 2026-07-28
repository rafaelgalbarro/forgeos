import type { VentureProject } from "@/lib/domain/venture";
import type { PortfolioMemory, Recommendation } from "../types";
import { getPatternsForVenture } from "../pattern-engine";
import { getLearningForVenture } from "../learning-engine";

function rec(
  ventureId: string,
  title: string,
  description: string,
  priority: Recommendation["priority"],
  rationale: string
): Recommendation {
  return {
    id: crypto.randomUUID(),
    ventureId,
    title,
    description,
    priority,
    rationale,
    generatedAt: new Date().toISOString(),
  };
}

export function generateRecommendations(
  venture: VentureProject,
  portfolioMemory: PortfolioMemory | null
): Recommendation[] {
  const recommendations: Recommendation[] = [];
  const discoveryCount = venture.discoveryContext?.answers.length ?? 0;

  if (discoveryCount < 3) {
    recommendations.push(
      rec(
        venture.id,
        "Completar discovery",
        "Responde las preguntas pendientes antes de avanzar",
        "high",
        "Discovery incompleto correlaciona con scores más bajos en el portfolio"
      )
    );
  }

  if (!venture.researchReport && venture.intelligenceAccepted) {
    recommendations.push(
      rec(
        venture.id,
        "Generar research",
        "Ejecuta research de mercado para validar supuestos",
        "medium",
        "Ventures con research tienen mejor contexto para PRD y simulador"
      )
    );
  }

  if (!venture.ventureSimulatorResult && discoveryCount > 0) {
    recommendations.push(
      rec(
        venture.id,
        "Ejecutar simulador",
        "Evalúa viabilidad financiera con el Venture Simulator",
        "high",
        "El simulador integra discovery, research y producto"
      )
    );
  }

  if (venture.ventureSimulatorResult) {
    const s = venture.ventureSimulatorResult;
    if (s.recommendation === "research_more") {
      recommendations.push(
        rec(
          venture.id,
          "Profundizar investigación",
          s.recommendedAlternatives[0] ?? "Ampliar análisis de mercado",
          "high",
          `Recomendación del simulador: ${s.recommendationLabel}`
        )
      );
    }
    if (s.recommendation === "build_small_mvp") {
      recommendations.push(
        rec(
          venture.id,
          "Construir MVP acotado",
          "Enfócate en el núcleo de valor con scope mínimo",
          "medium",
          `Score ${s.startupScore}/100 — viable con MVP reducido`
        )
      );
    }
  }

  const patterns = getPatternsForVenture(venture.id);
  for (const p of patterns) {
    if (p.type === "build_delay") {
      recommendations.push(
        rec(
          venture.id,
          "Avanzar a build",
          "Han pasado semanas sin secciones de ingeniería",
          "high",
          p.description
        )
      );
    }
    if (p.type === "incomplete_discovery") {
      recommendations.push(
        rec(
          venture.id,
          "Mejorar discovery",
          "Completar aclaraciones antes de decisiones de producto",
          "medium",
          p.description
        )
      );
    }
  }

  const learning = getLearningForVenture(venture.id);
  if (learning) {
    for (const action of learning.recommendedActions.slice(0, 2)) {
      if (!recommendations.some((r) => r.title === action)) {
        recommendations.push(
          rec(venture.id, action, action, "low", "Derivado del motor de aprendizaje")
        );
      }
    }
  }

  if (portfolioMemory) {
    const saasPattern = portfolioMemory.patterns.find((p) => p.type === "saas_preference");
    if (
      saasPattern &&
      saasPattern.ventureIds.length / Math.max(portfolioMemory.totalVentures, 1) > 0.6 &&
      !/saas/i.test(venture.intelligenceReport?.recommendedBusinessModel ?? "")
    ) {
      recommendations.push(
        rec(
          venture.id,
          "Considerar modelo SaaS",
          "El portfolio muestra fuerte preferencia por SaaS",
          "low",
          saasPattern.description
        )
      );
    }
  }

  return recommendations;
}
