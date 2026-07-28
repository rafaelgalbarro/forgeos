import type { VentureProject } from "@/lib/domain/venture";
import {
  runVentureSimulator,
  ventureToSimulatorInput,
} from "@/lib/venture-simulator";
import type { CEOBrief, CEORecommendationItem } from "./types";
import { deriveNextAction } from "./portfolio-analytics";

interface ScoredRecommendation extends CEORecommendationItem {
  sortKey: number;
}

function buildVentureRecommendations(venture: VentureProject): ScoredRecommendation[] {
  const items: ScoredRecommendation[] = [];
  const sim =
    venture.ventureSimulatorResult ??
    runVentureSimulator(ventureToSimulatorInput(venture));

  const remaining = venture.discoveryContext?.remainingQuestions?.length ?? 0;
  const ventureScore = sim?.ventureScore ?? venture.intelligenceReport?.startupScore ?? 0;

  if (
    venture.status === "intelligence" &&
    sim?.recommendation === "build" &&
    ventureScore >= 60
  ) {
    items.push({
      id: `${venture.id}-ready-build`,
      ventureId: venture.id,
      ventureName: venture.name,
      message: `«${venture.name}» está lista para construir.`,
      priority: "high",
      sortKey: 100 - ventureScore,
    });
  }

  if (remaining > 0 || (venture.status === "intelligence" && (venture.discoveryContext?.answers.length ?? 0) < 2)) {
    const n = remaining || Math.max(1, 2 - (venture.discoveryContext?.answers.length ?? 0));
    items.push({
      id: `${venture.id}-discovery`,
      ventureId: venture.id,
      ventureName: venture.name,
      message: `«${venture.name}» necesita responder ${n} pregunta${n > 1 ? "s" : ""} de Discovery.`,
      priority: "high",
      sortKey: 50 + n,
    });
  }

  if (ventureScore < 45 && venture.status !== "building") {
    items.push({
      id: `${venture.id}-low-score`,
      ventureId: venture.id,
      ventureName: venture.name,
      message: `«${venture.name}» tiene Venture Score bajo (${ventureScore}/100).`,
      priority: "medium",
      sortKey: 200 - ventureScore,
    });
  }

  if (venture.status === "building") {
    items.push({
      id: `${venture.id}-building`,
      ventureId: venture.id,
      ventureName: venture.name,
      message: `«${venture.name}» está en construcción — revisa el progreso.`,
      priority: "medium",
      sortKey: 80,
    });
  }

  if (venture.status === "ready" && sim?.recommendation === "build_small_mvp") {
    items.push({
      id: `${venture.id}-mvp`,
      ventureId: venture.id,
      ventureName: venture.name,
      message: `«${venture.name}» tiene MVP listo para validar con usuarios.`,
      priority: "medium",
      sortKey: 70,
    });
  }

  if (!venture.researchReport && venture.status !== "intelligence") {
    items.push({
      id: `${venture.id}-research`,
      ventureId: venture.id,
      ventureName: venture.name,
      message: `«${venture.name}» necesita completar Research.`,
      priority: "medium",
      sortKey: 90,
    });
  }

  return items;
}

const FALLBACK_RECOMMENDATIONS: CEORecommendationItem[] = [
  {
    id: "fallback-1",
    message: "Crea tu primera empresa para que el CEO AI pueda priorizar.",
    priority: "high",
  },
  {
    id: "fallback-2",
    message: "Completa Discovery antes de construir — reduce riesgo de pivot.",
    priority: "medium",
  },
  {
    id: "fallback-3",
    message: "Exporta el Build Plan cuando tengas un venture listo.",
    priority: "low",
  },
];

export function buildCEOBrief(ventures: VentureProject[]): CEOBrief {
  if (ventures.length === 0) {
    return {
      subtitle: "Aún no hay empresas en tu portfolio.",
      recommendations: FALLBACK_RECOMMENDATIONS,
      fullReportLines: FALLBACK_RECOMMENDATIONS.map((r) => `• ${r.message}`),
    };
  }

  const all = ventures
    .flatMap(buildVentureRecommendations)
    .sort((a, b) => a.sortKey - b.sortKey);

  const unique: CEORecommendationItem[] = [];
  const seen = new Set<string>();

  for (const item of all) {
    const key = item.message;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push({
      id: item.id,
      ventureId: item.ventureId,
      ventureName: item.ventureName,
      message: item.message,
      priority: item.priority,
    });
    if (unique.length >= 3) break;
  }

  while (unique.length < 3) {
    const fallbacks = [
      "Revisa los Venture Scores antes de invertir en build.",
      "Mantén máximo 2–3 empresas activas para evitar dispersión.",
      "Usa el Simulator para contrastar escenarios económicos.",
    ];
    const msg = fallbacks[unique.length];
    unique.push({
      id: `general-${unique.length}`,
      message: msg,
      priority: "low",
    });
  }

  const fullReportLines = ventures.map((v) => {
    const action = deriveNextAction(v);
    return `• ${v.name}: ${action}`;
  });

  return {
    subtitle: "He revisado todas tus empresas.",
    recommendations: unique.slice(0, 3),
    fullReportLines,
  };
}
