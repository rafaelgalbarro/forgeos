/** Program 10000 — Generic E2E checklist per pipeline stage. */

import type { VentureProject } from "@/lib/domain/venture";
import type { BuildContext } from "@/lib/build-platform/build-context";
import type { BuildDna } from "@/lib/build-platform/build-dna";
import type { BuildPipelineSnapshot } from "@/lib/build-pipeline";
import type { VentureIntelligenceSnapshot } from "@/lib/venture-intelligence";
import { E2E_PIPELINE } from "./pipeline-stages";
import type { E2EChecklistStatus, E2EStage, E2EStageId } from "./types";

function hasSection(venture: VentureProject, id: string): boolean {
  return venture.sections.some((s) => s.id === id && s.content.trim().length > 0);
}

function stageStatus(
  id: E2EStageId,
  venture: VentureProject,
  ctx: {
    buildContext: BuildContext | null;
    buildDna: BuildDna | null;
    pipeline: BuildPipelineSnapshot | null;
    intelligence: VentureIntelligenceSnapshot | null;
    completedRatio: number;
  }
): {
  status: E2EChecklistStatus;
  summary: string;
  risks: string[];
  pending: string[];
  recommendations: string[];
} {
  const ir = venture.intelligenceReport;
  const rr = venture.researchReport;
  const prd = venture.productPRD;

  switch (id) {
    case "idea":
      return venture.ideaText?.trim()
        ? { status: "completed", summary: venture.ideaText.slice(0, 120), risks: [], pending: [], recommendations: [] }
        : { status: "not_started", summary: "Sin idea definida", risks: ["Sin propuesta de valor"], pending: ["Definir idea"], recommendations: ["Completar discovery"] };

    case "research":
      return rr
        ? { status: "completed", summary: rr.marketSummary.slice(0, 100), risks: rr.marketRisks.slice(0, 2), pending: [], recommendations: rr.validationPlan?.slice(0, 1) ?? [] }
        : { status: "in_progress", summary: "Research parcial", risks: ["Datos de mercado incompletos"], pending: ["Generar research report"], recommendations: ["Ejecutar AI Runtime research"] };

    case "market":
      return ir?.market
        ? { status: "completed", summary: `TAM: ${ir.market.tamEstimate}`, risks: ir.risks.map((r) => r.title).slice(0, 2), pending: [], recommendations: ir.opportunities.map((o) => o.title).slice(0, 1) }
        : { status: "in_progress", summary: "Mercado en evaluación", risks: [], pending: ["TAM/SAM"], recommendations: ["Venture Intelligence market score"] };

    case "competitors":
      return rr?.competitors?.length
        ? { status: "completed", summary: `${rr.competitors.length} competidores analizados`, risks: [], pending: [], recommendations: [] }
        : hasSection(venture, "competidores")
          ? { status: "completed", summary: "Competidores en secciones", risks: [], pending: [], recommendations: [] }
          : { status: "blocked", summary: "Sin análisis competitivo", risks: ["Posicionamiento indefinido"], pending: ["Mapear competidores"], recommendations: ["Usar Research engine"] };

    case "business-model":
      return ir?.businessModel || venture.discoveryContext?.inferredBusinessModel
        ? { status: "completed", summary: ir?.recommendedBusinessModel ?? venture.discoveryContext?.inferredBusinessModel ?? "", risks: [], pending: [], recommendations: [] }
        : { status: "in_progress", summary: "Modelo pendiente", risks: ["Monetización no validada"], pending: ["Definir modelo"], recommendations: ["Founder Advisor"] };

    case "pricing":
      return hasSection(venture, "pricing") || ir?.recommendedBusinessModel
        ? { status: hasSection(venture, "pricing") ? "completed" : "in_progress", summary: hasSection(venture, "pricing") ? "Pricing documentado" : "Inferido desde business model", risks: [], pending: hasSection(venture, "pricing") ? [] : ["Tabla de precios"], recommendations: ["Validar willingness to pay"] }
        : { status: "not_started", summary: "Sin pricing", risks: ["Unit economics desconocidos"], pending: ["Pricing tiers"], recommendations: ["Venture Simulator"] };

    case "brand":
      return (ir?.tags?.length ?? 0) > 0 || hasSection(venture, "ux")
        ? { status: "completed", summary: `${ir?.tags?.length ?? 0} tags de marca`, risks: [], pending: [], recommendations: [] }
        : { status: "in_progress", summary: "Brand parcial", risks: [], pending: ["Guía de marca"], recommendations: ["Definir tono visual"] };

    case "landing":
      return hasSection(venture, "landing")
        ? { status: "completed", summary: "Landing planificada", risks: [], pending: [], recommendations: [] }
        : { status: "not_started", summary: "Sin landing", risks: ["Sin canal de captación"], pending: ["Landing page"], recommendations: ["lib/launch LandingPage"] };

    case "prd":
      return prd
        ? { status: "completed", summary: prd.executiveSummary.slice(0, 100), risks: prd.risks?.slice(0, 2) ?? [], pending: [], recommendations: prd.mvpScope?.slice(0, 1) ?? [] }
        : { status: "blocked", summary: "PRD ausente", risks: ["Scope indefinido"], pending: ["Generar PRD"], recommendations: ["Prompt Compiler + Context Engine"] };

    case "architecture":
      return hasSection(venture, "arquitectura")
        ? { status: "completed", summary: "Arquitectura documentada", risks: [], pending: [], recommendations: [] }
        : { status: "not_started", summary: "Sin arquitectura", risks: ["Deuda técnica temprana"], pending: ["Diagrama sistema"], recommendations: ["Architecture department"] };

    case "build-context":
      return ctx.buildContext && ctx.buildContext.meta.completenessScore >= 40
        ? { status: "completed", summary: `Build Context ${ctx.buildContext.meta.completenessScore}%`, risks: [], pending: [], recommendations: [] }
        : ctx.buildContext
          ? { status: "in_progress", summary: `Build Context ${ctx.buildContext.meta.completenessScore}%`, risks: [], pending: ["Completar secciones"], recommendations: ["rebuildBuildContext"] }
          : { status: "not_started", summary: "Sin Build Context", risks: [], pending: ["Generar context"], recommendations: ["buildBuildContextFromVenture"] };

    case "build-dna":
      return ctx.buildDna
        ? { status: "completed", summary: `DNA ${ctx.buildDna.meta.completenessScore}% — ${ctx.buildDna.meta.ventureName}`, risks: [], pending: [], recommendations: [] }
        : { status: "not_started", summary: "Sin Build DNA", risks: [], pending: ["Generar DNA"], recommendations: ["createBuildDnaFromContext"] };

    case "deployment-preview":
      return ctx.pipeline
        ? { status: ctx.pipeline.mode === "dry_run" ? "completed" : "in_progress", summary: `Pipeline ${ctx.pipeline.mode}`, risks: ctx.pipeline.risk?.factors?.slice(0, 2) ?? [], pending: [], recommendations: ["Approval antes de deploy real"] }
        : { status: "not_started", summary: "Sin preview", risks: [], pending: ["Dry-run pipeline"], recommendations: ["runBuildPipelineDryRun"] };

    case "investor-readiness":
      return ctx.intelligence && ctx.intelligence.investorReadiness.score >= 50
        ? { status: "completed", summary: `Readiness ${ctx.intelligence.investorReadiness.score}%`, risks: ctx.intelligence.risks.topRisks.slice(0, 2), pending: [], recommendations: [ctx.intelligence.investorReadiness.recommendedNextStep] }
        : { status: "in_progress", summary: "Investor readiness parcial", risks: [], pending: ["Data room"], recommendations: ["assessInvestorReadiness"] };

    case "go-to-market":
      return hasSection(venture, "landing") && (hasSection(venture, "kpis") || hasSection(venture, "roadmap"))
        ? { status: "completed", summary: "GTM planificado", risks: [], pending: [], recommendations: [] }
        : hasSection(venture, "landing")
          ? { status: "in_progress", summary: "GTM parcial", risks: [], pending: ["KPIs GTM"], recommendations: ["Growth department"] }
          : { status: "not_started", summary: "Sin GTM", risks: ["Lanzamiento sin canal"], pending: ["Plan GTM"], recommendations: ["Founder Journey finalize"] };

    case "launch-checklist":
      return ctx.completedRatio >= 0.75
        ? { status: "completed", summary: `${Math.round(ctx.completedRatio * 100)}% pipeline completado`, risks: [], pending: [], recommendations: ["Revisión CEO final"] }
        : ctx.completedRatio >= 0.4
          ? { status: "in_progress", summary: `${Math.round(ctx.completedRatio * 100)}% completado`, risks: ["Etapas críticas pendientes"], pending: ["Completar bloqueados"], recommendations: ["Priorizar PRD y Build Context"] }
          : { status: "blocked", summary: "Launch no listo", risks: ["Pipeline incompleto"], pending: ["Completar etapas base"], recommendations: ["Ejecutar validación completa"] };

    default:
      return { status: "not_started", summary: "", risks: [], pending: [], recommendations: [] };
  }
}

export function buildE2EChecklist(
  venture: VentureProject,
  ctx: {
    buildContext: BuildContext | null;
    buildDna: BuildDna | null;
    pipeline: BuildPipelineSnapshot | null;
    intelligence: VentureIntelligenceSnapshot | null;
  }
): E2EStage[] {
  const preliminary = E2E_PIPELINE.map((def) => {
    const eval_ = stageStatus(def.id, venture, { ...ctx, completedRatio: 0 });
    return { def, eval_ };
  });

  const completedCount = preliminary.filter((p) => p.eval_.status === "completed").length;
  const completedRatio = completedCount / E2E_PIPELINE.length;

  return E2E_PIPELINE.map((def) => {
    const eval_ = stageStatus(def.id, venture, { ...ctx, completedRatio });
    return {
      id: def.id,
      label: def.label,
      order: def.order,
      status: eval_.status,
      moduleUsed: def.moduleUsed,
      resultSummary: eval_.summary,
      risks: eval_.risks,
      pending: eval_.pending,
      recommendations: eval_.recommendations,
    };
  });
}
