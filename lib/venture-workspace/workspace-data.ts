import type { VentureProject } from "@/lib/domain/venture";
import {
  deriveCurrentState,
  formatVentureType,
  resolveLifeStage,
  resolveScores,
  resolveStatusBadge,
  sectionHasContent,
} from "@/lib/portfolio/venture-status";
import { buildVentureCeoBrief } from "./ceo-brief";
import { buildFounderLifecycle, resolveActiveLifecycleStage } from "./founder-lifecycle";
import { buildInvestmentReadiness } from "./investment-readiness";
import { resolveNextAction } from "./next-actions";
import { resolveWorkspaceScores } from "./startup-score";
import { buildWorkspaceActivity, buildWorkspaceTimeline } from "./timeline";
import type {
  VentureWorkspaceSnapshot,
  WorkspaceBuildStatus,
  WorkspaceContentSummary,
  WorkspaceMemorySummary,
} from "./types";

function sectionExcerpt(venture: VentureProject, id: string, fallback: string): WorkspaceContentSummary {
  const section = venture.sections.find((s) => s.id === id);
  const content = section?.content?.trim() ?? "";
  return {
    title: section?.title ?? fallback,
    excerpt: content.slice(0, 280) + (content.length > 280 ? "…" : ""),
    hasContent: content.length > 0,
    source: section?.format,
  };
}

function buildExecutiveSummary(venture: VentureProject): string {
  const resumen = venture.sections.find((s) => s.id === "resumen");
  if (resumen?.content?.trim()) {
    return resumen.content.slice(0, 500) + (resumen.content.length > 500 ? "…" : "");
  }
  if (venture.intelligenceReport?.founderAdvisor?.headline) {
    return venture.intelligenceReport.founderAdvisor.headline;
  }
  return (
    venture.description ||
    `${venture.name} es un venture ${formatVentureType(venture.category)} orientado a ${venture.targetAudience}.`
  );
}

function buildResearchSummary(venture: VentureProject): WorkspaceContentSummary {
  if (venture.researchReport) {
    const r = venture.researchReport;
    const excerpt =
      r.marketSummary?.slice(0, 280) ||
      r.opportunities?.[0]?.slice(0, 280) ||
      r.differentiationAngles?.[0]?.slice(0, 280) ||
      "";
    return {
      title: "Research de mercado",
      excerpt: excerpt + (excerpt.length >= 280 ? "…" : ""),
      hasContent: true,
      source: venture.researchMeta?.source ?? "ai",
    };
  }
  const section = sectionExcerpt(venture, "mercado", "Mercado");
  if (section.hasContent) return { ...section, title: "Research de mercado" };
  return {
    title: "Research de mercado",
    excerpt: "Research pendiente. Completa el análisis de mercado para desbloquear el PRD.",
    hasContent: false,
  };
}

function buildProductSummary(venture: VentureProject): WorkspaceContentSummary {
  if (venture.productPRD) {
    const prd = venture.productPRD;
    const excerpt = prd.executiveSummary?.slice(0, 280) || prd.problemStatement?.slice(0, 280) || "";
    return {
      title: "Product Requirements Document",
      excerpt: excerpt + (excerpt.length >= 280 ? "…" : ""),
      hasContent: true,
      source: venture.productPRDSource ?? venture.productMeta?.source,
    };
  }
  const mvp = sectionExcerpt(venture, "mvp", "MVP");
  if (mvp.hasContent) return { ...mvp, title: "MVP" };
  return {
    title: "Product",
    excerpt: "PRD pendiente. Define el alcance del MVP para avanzar al Build.",
    hasContent: false,
  };
}

function buildArchitectureSummary(venture: VentureProject): WorkspaceContentSummary {
  const arch = sectionExcerpt(venture, "arquitectura", "Arquitectura");
  if (arch.hasContent) return arch;
  return {
    title: "Arquitectura",
    excerpt: "Arquitectura pendiente. Se generará durante el Build.",
    hasContent: false,
  };
}

function buildKnowledgeSummary(venture: VentureProject): WorkspaceContentSummary {
  const refs = venture.productMeta?.usedKnowledgeRefs ?? [];
  if (refs.length > 0) {
    return {
      title: "Knowledge base",
      excerpt: refs.map((r) => r.title).join(" · "),
      hasContent: true,
      source: "knowledge",
    };
  }
  const tags = venture.analysis?.tags?.map((t) => t.label).join(", ");
  return {
    title: "Knowledge",
    excerpt: tags || "Sin referencias de conocimiento vinculadas todavía.",
    hasContent: !!tags,
  };
}

function buildBuildStatus(venture: VentureProject): WorkspaceBuildStatus {
  const items = [
    { label: "Arquitectura", done: sectionHasContent(venture, "arquitectura") },
    { label: "Base de datos", done: sectionHasContent(venture, "base-datos") },
    { label: "Backend", done: sectionHasContent(venture, "backend") },
    { label: "Frontend", done: sectionHasContent(venture, "frontend") },
    { label: "QA", done: sectionHasContent(venture, "qa") },
  ];
  const doneCount = items.filter((i) => i.done).length;
  const progress = Math.round((doneCount / items.length) * 100);

  let phase = "No iniciado";
  if (venture.status === "building") phase = "En construcción";
  else if (venture.status === "ready" && doneCount > 0) phase = "Completado";
  else if (doneCount > 0) phase = "Parcial";

  return { phase, progress, items };
}

function buildMemorySummary(venture: VentureProject): WorkspaceMemorySummary {
  const milestones: string[] = [];
  if (venture.intelligenceReport) milestones.push("Análisis de inteligencia completado");
  if (venture.researchReport) milestones.push("Research de mercado finalizado");
  if (venture.productPRD) milestones.push("PRD definido");
  if (venture.status === "ready") milestones.push("Paquete startup generado");

  const decisions =
    venture.discoveryContext?.answers.map((a) => `${a.question}: ${a.answer}`).slice(0, 5) ?? [];

  const learnings: string[] = [];
  if (venture.founderAdvisor?.summary) {
    learnings.push(venture.founderAdvisor.summary);
  }
  if (venture.ventureSimulatorResult?.recommendation) {
    learnings.push(`Simulador recomienda: ${venture.ventureSimulatorResult.recommendation}`);
  }

  return {
    headline: `${milestones.length} hitos registrados en la memoria del venture.`,
    milestones,
    decisions,
    learnings,
  };
}

function buildMetrics(venture: VentureProject): { label: string; value: string; detail: string }[] {
  const scores = resolveScores(venture);
  const analysis = venture.analysis?.market;

  return [
    {
      label: "Probabilidad de éxito",
      value: analysis?.probabilidadExito ? `${analysis.probabilidadExito}%` : "—",
      detail: "Estimación heurística de mercado",
    },
    {
      label: "Tiempo MVP",
      value: analysis?.tiempoMvp ?? venture.intelligenceReport?.estimatedMvpTime ?? "—",
      detail: "Estimación de tiempo al primer MVP",
    },
    {
      label: "Complejidad técnica",
      value: analysis?.complejidadTecnica ?? "—",
      detail: "Nivel de esfuerzo de ingeniería",
    },
    {
      label: "Confianza del análisis",
      value: scores.confidence.charAt(0).toUpperCase() + scores.confidence.slice(1),
      detail: "Basada en contexto disponible",
    },
  ];
}

export function buildVentureWorkspaceData(venture: VentureProject): VentureWorkspaceSnapshot {
  const scores = resolveWorkspaceScores(venture);
  const life = resolveLifeStage(venture, scores.rawVenture);
  const badge = resolveStatusBadge(venture);

  return {
    venture,
    currentState: deriveCurrentState(venture),
    lifeStageLabel: life.label,
    statusBadgeLabel: badge.label,
    startupScore: scores.startupScore,
    ventureScore: scores.ventureScore,
    confidenceLabel: scores.confidenceLabel,
    founderLifecycle: buildFounderLifecycle(venture),
    activeLifecycleStage: resolveActiveLifecycleStage(venture),
    ceoBrief: buildVentureCeoBrief(venture),
    investmentReadiness: buildInvestmentReadiness(venture),
    nextAction: resolveNextAction(venture),
    timeline: buildWorkspaceTimeline(venture),
    activity: buildWorkspaceActivity(venture),
    memory: buildMemorySummary(venture),
    buildStatus: buildBuildStatus(venture),
    executiveSummary: buildExecutiveSummary(venture),
    research: buildResearchSummary(venture),
    product: buildProductSummary(venture),
    architecture: buildArchitectureSummary(venture),
    knowledge: buildKnowledgeSummary(venture),
    metrics: buildMetrics(venture),
  };
}
