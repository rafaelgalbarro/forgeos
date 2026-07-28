/** Venture Knowledge Hub — read-only adapters (Epic 7.5). */

import type { VentureProject } from "@/lib/domain/venture";
import type { ProductPRD } from "@/lib/ai/types/product";
import type { ResearchReport } from "@/lib/ai/types/research";
import type { DiscoveryContext } from "@/lib/discovery/types";
import { buildBuildContextFromVenture } from "@/lib/build-platform/build-context";
import { createBuildDnaFromContext } from "@/lib/build-platform/build-dna";
import { getExecutiveGraphForVenture } from "@/lib/ai-orchestration/decision-graph-writer";
import { getExecutiveRuntimeMemory } from "@/lib/ai-orchestration/executive-memory-writer";
import { getDecisionsForVenture } from "@/lib/intelligence-layer/decision-engine";
import { getVentureMemory } from "@/lib/intelligence-layer/venture-memory";
import { getIntelligenceKnowledgeHints } from "@/lib/intelligence/knowledge-context";
import { searchKnowledge } from "@/lib/knowledge/knowledge-queries";
import type { KnowledgeCategory, KnowledgeNode, KnowledgeNodeStatus } from "./types";

export interface AdapterSlice {
  nodes: Omit<KnowledgeNode, "updatedAt">[];
}

function statusFrom(parts: unknown[]): KnowledgeNodeStatus {
  const filled = parts.filter((p) => {
    if (p == null) return false;
    if (typeof p === "string") return p.trim().length > 0;
    if (Array.isArray(p)) return p.length > 0;
    if (typeof p === "object") return Object.keys(p as object).length > 0;
    return true;
  }).length;
  if (filled === 0) return "empty";
  if (filled >= parts.length) return "complete";
  return "partial";
}

function sectionContent(venture: VentureProject, id: string): string | null {
  const section = venture.sections.find((s) => s.id === id);
  return section?.content?.trim() || null;
}

function truncate(text: string, max = 400): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max).trim()}…`;
}

export function adaptDiscoveryNodes(venture: VentureProject): AdapterSlice {
  const ctx = venture.discoveryContext as DiscoveryContext | undefined;
  const nodes: AdapterSlice["nodes"] = [];

  nodes.push({
    id: "discovery-context",
    category: "discovery",
    title: "Discovery Context",
    summary: ctx?.inferredProductType
      ? `Producto: ${ctx.inferredProductType} · Modelo: ${ctx.inferredBusinessModel ?? "—"}`
      : "Sin contexto de discovery",
    content: [
      ctx?.inferredProductType && `**Tipo de producto:** ${ctx.inferredProductType}`,
      ctx?.inferredBusinessModel && `**Modelo de negocio:** ${ctx.inferredBusinessModel}`,
      ctx?.clarifiedDecisions?.length
        ? `**Decisiones aclaradas:**\n${ctx.clarifiedDecisions.map((d) => `• ${d}`).join("\n")}`
        : null,
      ctx?.remainingQuestions?.length
        ? `**Preguntas pendientes:**\n${ctx.remainingQuestions.map((q) => `• ${q}`).join("\n")}`
        : null,
      venture.discoveryAnswers && Object.keys(venture.discoveryAnswers).length > 0
        ? `**Respuestas:** ${Object.keys(venture.discoveryAnswers).length} campos completados`
        : null,
    ]
      .filter(Boolean)
      .join("\n\n") || "No hay datos de discovery para este venture.",
    status: statusFrom([ctx?.inferredProductType, ctx?.answers?.length]),
    sourceModule: "lib/discovery",
    tags: ["discovery"],
  });

  return { nodes };
}

export function adaptResearchNodes(venture: VentureProject): AdapterSlice {
  const report = venture.researchReport as ResearchReport | undefined;
  const nodes: AdapterSlice["nodes"] = [];

  nodes.push({
    id: "research-market",
    category: "research",
    title: "Market Research",
    summary: report?.marketSummary
      ? truncate(report.marketSummary, 200)
      : "Sin informe de mercado",
    content: [
      report?.marketSummary && `**Resumen de mercado**\n${report.marketSummary}`,
      report?.targetSegments?.length
        ? `**Segmentos:** ${report.targetSegments.join(", ")}`
        : null,
      report?.opportunities?.length
        ? `**Oportunidades:**\n${report.opportunities.map((o) => `• ${o}`).join("\n")}`
        : null,
      report?.marketRisks?.length
        ? `**Riesgos:**\n${report.marketRisks.map((r) => `• ${r}`).join("\n")}`
        : null,
      report?.differentiationAngles?.length
        ? `**Diferenciación:**\n${report.differentiationAngles.map((d) => `• ${d}`).join("\n")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n\n") || "No hay informe de research.",
    status: statusFrom([report?.marketSummary, report?.targetSegments]),
    sourceModule: "lib/ai/types/research",
    tags: ["research", "market"],
  });

  const competitors = report?.competitors ?? [];
  nodes.push({
    id: "research-competitors",
    category: "research",
    title: "Competidores",
    parentId: "research-market",
    summary:
      competitors.length > 0
        ? `${competitors.length} competidor${competitors.length > 1 ? "es" : ""} identificado${competitors.length > 1 ? "s" : ""}`
        : "Sin competidores analizados",
    content:
      competitors.length > 0
        ? competitors
            .map(
              (c) =>
                `**${c.name}** (${c.type ?? "—"})\nFortalezas: ${c.strengths?.join(", ") ?? "—"} · Debilidades: ${c.weaknesses?.join(", ") ?? "—"}`
            )
            .join("\n\n")
        : "No hay competidores en el informe de research.",
    status: competitors.length >= 2 ? "complete" : competitors.length === 1 ? "partial" : "empty",
    sourceModule: "lib/ai/types/research",
    tags: ["competitors", "research"],
  });

  return { nodes };
}

export function adaptProductNodes(venture: VentureProject): AdapterSlice {
  const prd = venture.productPRD as ProductPRD | undefined;
  const nodes: AdapterSlice["nodes"] = [];

  nodes.push({
    id: "product-prd",
    category: "product",
    title: "Product PRD",
    summary: prd?.executiveSummary
      ? truncate(prd.executiveSummary, 200)
      : "Sin PRD generado",
    content: prd
      ? [
          `**Resumen ejecutivo**\n${prd.executiveSummary}`,
          `**Problema**\n${prd.problemStatement}`,
          `**Cliente objetivo**\n${prd.targetCustomer}`,
          `**Propuesta de valor**\n${prd.valueProposition}`,
          prd.mvpScope?.length
            ? `**MVP Scope:**\n${prd.mvpScope.map((s) => `• ${s}`).join("\n")}`
            : null,
          prd.userStories?.length
            ? `**User stories:**\n${prd.userStories.slice(0, 8).map((s) => `• ${s}`).join("\n")}`
            : null,
          prd.successMetrics?.length
            ? `**Métricas:** ${prd.successMetrics.join(" · ")}`
            : null,
        ]
          .filter(Boolean)
          .join("\n\n")
      : "No hay PRD para este venture.",
    status: statusFrom([prd?.executiveSummary, prd?.mvpScope, prd?.userStories]),
    sourceModule: "lib/ai/types/product",
    tags: ["prd", "product"],
  });

  if (venture.productMeta?.usedKnowledgeRefs?.length) {
    nodes.push({
      id: "product-knowledge-refs",
      category: "product",
      title: "Referencias de conocimiento (PRD)",
      parentId: "product-prd",
      summary: `${venture.productMeta.usedKnowledgeRefs.length} referencias usadas en PRD`,
      content: venture.productMeta.usedKnowledgeRefs
        .map((r) => `• **${r.title}** (${r.domain}) — id: ${r.id}`)
        .join("\n"),
      status: "complete",
      sourceModule: "lib/ai/types/product",
      tags: ["knowledge", "product"],
    });
  }

  return { nodes };
}

export function adaptArchitectureNodes(venture: VentureProject): AdapterSlice {
  const markdown = sectionContent(venture, "arquitectura");
  const dbSection = sectionContent(venture, "base-datos");
  const backend = sectionContent(venture, "backend");
  const frontend = sectionContent(venture, "frontend");

  const nodes: AdapterSlice["nodes"] = [
    {
      id: "architecture-overview",
      category: "architecture",
      title: "Arquitectura",
      summary: markdown ? truncate(markdown.replace(/^#+\s*/gm, ""), 200) : "Sin sección de arquitectura",
      content: markdown ?? "No hay documentación de arquitectura generada.",
      status: markdown ? "partial" : "empty",
      sourceModule: "lib/domain/venture-sections",
      tags: ["architecture"],
    },
  ];

  if (dbSection) {
    nodes.push({
      id: "architecture-database",
      category: "architecture",
      title: "Base de datos",
      parentId: "architecture-overview",
      summary: truncate(dbSection.replace(/^#+\s*/gm, ""), 150),
      content: dbSection,
      status: "partial",
      sourceModule: "lib/domain/venture-sections",
      tags: ["database", "architecture"],
    });
  }
  if (backend) {
    nodes.push({
      id: "architecture-backend",
      category: "architecture",
      title: "Backend",
      parentId: "architecture-overview",
      summary: truncate(backend.replace(/^#+\s*/gm, ""), 150),
      content: backend,
      status: "partial",
      sourceModule: "lib/domain/venture-sections",
      tags: ["backend", "architecture"],
    });
  }
  if (frontend) {
    nodes.push({
      id: "architecture-frontend",
      category: "architecture",
      title: "Frontend",
      parentId: "architecture-overview",
      summary: truncate(frontend.replace(/^#+\s*/gm, ""), 150),
      content: frontend,
      status: "partial",
      sourceModule: "lib/domain/venture-sections",
      tags: ["frontend", "architecture"],
    });
  }

  return { nodes };
}

export function adaptUxNodes(venture: VentureProject): AdapterSlice {
  const prd = venture.productPRD as ProductPRD | undefined;
  const uxSection = sectionContent(venture, "ux") ?? sectionContent(venture, "wireframes");
  const nodes: AdapterSlice["nodes"] = [];

  nodes.push({
    id: "ux-overview",
    category: "ux",
    title: "UX & Flows",
    summary: prd?.mainScreens?.length
      ? `${prd.mainScreens.length} pantallas · ${prd.coreFlows?.length ?? 0} flujos`
      : uxSection
        ? "Wireframes / UX documentados"
        : "Sin datos UX",
    content: [
      prd?.mainScreens?.length
        ? `**Pantallas principales:**\n${prd.mainScreens.map((s) => `• ${s}`).join("\n")}`
        : null,
      prd?.coreFlows?.length
        ? `**Flujos core:**\n${prd.coreFlows.map((f) => `• ${f}`).join("\n")}`
        : null,
      uxSection ? `**Wireframes / UX**\n${uxSection}` : null,
    ]
      .filter(Boolean)
      .join("\n\n") || "No hay información UX disponible.",
    status: statusFrom([prd?.mainScreens, prd?.coreFlows, uxSection]),
    sourceModule: "lib/ai/types/product + venture-sections",
    tags: ["ux"],
  });

  return { nodes };
}

export function adaptBrandNodes(venture: VentureProject): AdapterSlice {
  const landing = sectionContent(venture, "landing");
  const resumen = sectionContent(venture, "resumen");
  const context = buildBuildContextFromVenture(venture, { persist: false, recordHistory: false });
  const dna = createBuildDnaFromContext(context);
  const branding = dna.branding;

  const nodes: AdapterSlice["nodes"] = [
    {
      id: "brand-identity",
      category: "brand",
      title: "Brand Identity",
      summary: venture.description
        ? truncate(venture.description, 200)
        : branding?.primaryColor ?? "Identidad de marca pendiente",
      content: [
        `**Nombre:** ${venture.name}`,
        venture.description && `**Descripción:** ${venture.description}`,
        landing && `**Landing**\n${truncate(landing, 600)}`,
        !landing && resumen && `**Resumen**\n${truncate(resumen, 600)}`,
        branding && `**Color primario:** ${branding.primaryColor}`,
        branding?.fontFamily && `**Tipografía:** ${branding.fontFamily}`,
        branding?.rules?.length
          ? `**Reglas:**\n${branding.rules.map((r) => `• ${r}`).join("\n")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n\n"),
      status: statusFrom([venture.description, landing ?? resumen, branding?.primaryColor]),
      sourceModule: "lib/build-platform/build-dna + venture-sections",
      tags: ["brand"],
    },
  ];

  return { nodes };
}

export function adaptBuildNodes(venture: VentureProject): AdapterSlice {
  const context = buildBuildContextFromVenture(venture, { persist: false, recordHistory: false });
  const dna = createBuildDnaFromContext(context);
  const nodes: AdapterSlice["nodes"] = [];

  nodes.push({
    id: "build-context",
    category: "build",
    title: "Build Context",
    summary: `Completitud ${context.meta.completenessScore}% · v${context.meta.version}`,
    content: [
      `**Venture:** ${context.meta.ventureName}`,
      `**Completitud:** ${context.meta.completenessScore}%`,
      `**Secciones:** ${Object.values(context.sections).filter((s) => s.status !== "empty").length} con contenido`,
      `**Stack (DNA):** ${dna.stack.frontend} + ${dna.stack.backend} · DB: ${dna.stack.database}`,
      `**Estándares:** ${dna.codingStandards.namingConvention}`,
    ].join("\n"),
    status: context.meta.completenessScore >= 70 ? "complete" : context.meta.completenessScore >= 30 ? "partial" : "empty",
    sourceModule: "lib/build-platform/build-context",
    tags: ["build", "context"],
  });

  nodes.push({
    id: "build-dna",
    category: "build",
    title: "Build DNA",
    parentId: "build-context",
    summary: `${dna.stack.frontend} / ${dna.stack.backend} / ${dna.stack.database}`,
    content: [
      `**Frontend:** ${dna.stack.frontend}`,
      `**Backend:** ${dna.stack.backend}`,
      `**Database:** ${dna.stack.database}`,
      `**Deploy:** ${dna.stack.deployment}`,
      `**Arquitectura:** ${dna.architecture.architecture}`,
      `**Testing:** cobertura mín ${dna.testing.unitCoverageMin}% · e2e ${dna.testing.e2eRequired ? "sí" : "no"}`,
      `**Seguridad:** OAuth ${dna.security.oauthRequired ? "requerido" : "opcional"}`,
    ].join("\n"),
    status: "complete",
    sourceModule: "lib/build-platform/build-dna",
    tags: ["dna", "build"],
  });

  const buildPlan = sectionContent(venture, "build-plan");
  if (buildPlan) {
    nodes.push({
      id: "build-plan",
      category: "build",
      title: "Build Plan",
      parentId: "build-context",
      summary: truncate(buildPlan.replace(/^#+\s*/gm, ""), 150),
      content: buildPlan,
      status: "partial",
      sourceModule: "lib/build-plan",
      tags: ["build-plan"],
    });
  }

  return { nodes };
}

export function adaptDeploymentNodes(venture: VentureProject): AdapterSlice {
  const context = buildBuildContextFromVenture(venture, { persist: false, recordHistory: false });
  const dna = createBuildDnaFromContext(context);
  const deploy = dna.deployment;
  const qa = sectionContent(venture, "qa");

  const nodes: AdapterSlice["nodes"] = [
    {
      id: "deployment-target",
      category: "deployment",
      title: "Deployment Target",
      summary: dna.stack.deployment
        ? `Plataforma: ${dna.stack.deployment}`
        : "Sin target de deployment",
      content: [
        dna.stack.deployment && `**Plataforma principal:** ${dna.stack.deployment}`,
        dna.stack.cicd && `**CI/CD:** ${dna.stack.cicd}`,
        deploy?.environments?.length
          ? `**Entornos:** ${deploy.environments.join(", ")}`
          : null,
        deploy?.rollbackStrategy && `**Rollback:** ${deploy.rollbackStrategy}`,
        deploy?.rules?.length
          ? `**Reglas:**\n${deploy.rules.map((r) => `• ${r}`).join("\n")}`
          : null,
        qa && `**QA**\n${truncate(qa, 500)}`,
      ]
        .filter(Boolean)
        .join("\n\n") || "No hay configuración de deployment.",
      status: statusFrom([dna.stack.deployment, deploy?.rollbackStrategy]),
      sourceModule: "lib/build-platform/build-dna/deployment-rules",
      tags: ["deployment"],
    },
  ];

  return { nodes };
}

export function adaptMemoryNodes(venture: VentureProject): AdapterSlice {
  const ventureMemory = getVentureMemory(venture.id);
  const execMemory = getExecutiveRuntimeMemory();
  const ceoReviews = execMemory.ceoReviews.filter((r) => r.ventureId === venture.id);
  const lessons = execMemory.lessonsLearned.slice(0, 10);
  const nodes: AdapterSlice["nodes"] = [];

  nodes.push({
    id: "memory-venture",
    category: "memory",
    title: "Venture Memory",
    summary: ventureMemory?.researchSummary
      ? truncate(ventureMemory.researchSummary, 200)
      : ventureMemory
        ? "Memoria de venture registrada"
        : "Sin memoria de venture",
    content: ventureMemory
      ? [
          ventureMemory.researchSummary && `**Research:** ${ventureMemory.researchSummary}`,
          ventureMemory.assumptions?.length
            ? `**Supuestos:**\n${ventureMemory.assumptions.map((a) => `• ${a}`).join("\n")}`
            : null,
          ventureMemory.risks?.length
            ? `**Riesgos:**\n${ventureMemory.risks.map((r) => `• ${r}`).join("\n")}`
            : null,
          ventureMemory.decisions?.length
            ? `**Decisiones:**\n${ventureMemory.decisions.map((d) => `• ${d}`).join("\n")}`
            : null,
        ]
          .filter(Boolean)
          .join("\n\n")
      : "No hay memoria de intelligence layer para este venture.",
    status: ventureMemory ? "partial" : "empty",
    sourceModule: "lib/intelligence-layer/venture-memory",
    tags: ["memory"],
  });

  const execDecisions = execMemory.executiveDecisions.filter((d) => d.ventureId === venture.id);
  if (execDecisions.length > 0 || ceoReviews.length > 0 || lessons.length > 0) {
    nodes.push({
      id: "memory-executive",
      category: "memory",
      title: "Executive Memory",
      parentId: "memory-venture",
      summary: `${execDecisions.length} decisiones · ${ceoReviews.length} CEO reviews`,
      content: [
        execDecisions.length > 0
          ? `**Decisiones ejecutivas:**\n${execDecisions
              .slice(0, 8)
              .map((d) => `• ${d.title}: ${d.decision}`)
              .join("\n")}`
          : null,
        ceoReviews.length > 0
          ? `**CEO Reviews:**\n${ceoReviews
              .slice(0, 5)
              .map((r) => `• ${r.output.summary}`)
              .join("\n")}`
          : null,
        lessons.length > 0
          ? `**Lecciones (global):**\n${lessons.map((l) => `• ${l}`).join("\n")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n\n"),
      status: execDecisions.length > 0 ? "partial" : "empty",
      sourceModule: "lib/ai-orchestration/executive-memory-writer",
      tags: ["executive", "memory"],
    });
  }

  return { nodes };
}

export function adaptDecisionNodes(venture: VentureProject): AdapterSlice {
  const graphNodes = getExecutiveGraphForVenture(venture.id);
  const decisions = getDecisionsForVenture(venture.id);
  const nodes: AdapterSlice["nodes"] = [];

  nodes.push({
    id: "decisions-graph",
    category: "decisions",
    title: "Decision Graph",
    summary:
      graphNodes.length > 0
        ? `${graphNodes.length} nodos en el grafo ejecutivo`
        : "Sin nodos en decision graph",
    content:
      graphNodes.length > 0
        ? graphNodes
            .slice(0, 15)
            .map(
              (n) =>
                `**${n.title}** (${n.nodeType})\n${n.rationale}\nImpacto: ${n.impact} · Confianza: ${Math.round(n.confidence * 100)}%`
            )
            .join("\n\n")
        : "No hay nodos en el grafo de decisiones ejecutivo.",
    status: graphNodes.length >= 3 ? "complete" : graphNodes.length > 0 ? "partial" : "empty",
    sourceModule: "lib/ai-orchestration/decision-graph-writer",
    tags: ["decisions", "graph"],
  });

  if (decisions.length > 0) {
    nodes.push({
      id: "decisions-formal",
      category: "decisions",
      title: "Formal Decisions",
      parentId: "decisions-graph",
      summary: `${decisions.length} decisiones formales registradas`,
      content: decisions
        .slice(0, 12)
        .map(
          (d) =>
            `**${d.title}** (${d.status})\n${d.description}\nPor: ${d.takenBy} · ${d.date}`
        )
        .join("\n\n"),
      status: "partial",
      sourceModule: "lib/intelligence-layer/decision-engine",
      tags: ["decisions"],
    });
  }

  const decisionesSection = sectionContent(venture, "decisiones");
  if (decisionesSection) {
    nodes.push({
      id: "decisions-clarified",
      category: "decisions",
      title: "Decisiones aclaradas (doc)",
      parentId: "decisions-graph",
      summary: truncate(decisionesSection.replace(/^#+\s*/gm, ""), 150),
      content: decisionesSection,
      status: "partial",
      sourceModule: "lib/domain/venture-sections",
      tags: ["decisions"],
    });
  }

  return { nodes };
}

export function adaptKnowledgeCatalogNodes(venture: VentureProject): AdapterSlice {
  const hints = getIntelligenceKnowledgeHints(venture.ideaText);
  const catalogResults = searchKnowledge(venture.ideaText, { limit: 8 });
  const intelRefs = venture.productMeta?.usedKnowledgeRefs ?? [];
  const researchRefs = venture.researchMeta?.usedKnowledgeRefs ?? [];
  const allRefs = [...intelRefs, ...researchRefs];
  const nodes: AdapterSlice["nodes"] = [];

  nodes.push({
    id: "knowledge-catalog",
    category: "knowledge",
    title: "Knowledge Catalog",
    summary:
      catalogResults.length > 0
        ? `${catalogResults.length} entradas relevantes en catálogo`
        : "Sin matches en catálogo global",
    content: [
      hints.patternTitles?.length
        ? `**Patrones sugeridos:** ${hints.patternTitles.join(", ")}`
        : null,
      hints.businessModelTitles?.length
        ? `**Modelos de negocio:** ${hints.businessModelTitles.join(", ")}`
        : null,
      hints.competitorTitles?.length
        ? `**Competidores (catálogo):** ${hints.competitorTitles.join(", ")}`
        : null,
      catalogResults.length > 0
        ? `**Entradas:**\n${catalogResults.map((e) => `• **${e.title}** (${e.domain}) — ${truncate(e.description, 120)}`).join("\n")}`
        : null,
      allRefs.length > 0
        ? `**Refs usadas en venture:**\n${allRefs.map((r) => `• ${r.title} (${r.domain})`).join("\n")}`
        : null,
    ]
      .filter(Boolean)
      .join("\n\n") || "No hay entradas de conocimiento vinculadas.",
    status: catalogResults.length > 0 || allRefs.length > 0 ? "partial" : "empty",
    sourceModule: "lib/knowledge + lib/intelligence/knowledge-context",
    tags: ["knowledge", "catalog"],
  });

  if (venture.intelligenceReport) {
    nodes.push({
      id: "knowledge-intelligence",
      category: "knowledge",
      title: "Intelligence Tags",
      parentId: "knowledge-catalog",
      summary: venture.intelligenceReport.tags?.length
        ? `${venture.intelligenceReport.tags.length} tags detectados`
        : "Sin tags de intelligence",
      content: [
        venture.intelligenceReport.market &&
          `**Mercado:** TAM ${venture.intelligenceReport.market.tamEstimate} · Crecimiento ${venture.intelligenceReport.market.growthTrend}`,
        venture.intelligenceReport.competition &&
          `**Competencia:** ${venture.intelligenceReport.competition.landscape}`,
        venture.intelligenceReport.tags?.length
          ? `**Tags:** ${venture.intelligenceReport.tags.map((t) => t.label ?? t.id).join(", ")}`
          : null,
      ]
        .filter(Boolean)
        .join("\n"),
      status: venture.intelligenceReport.tags?.length ? "partial" : "empty",
      sourceModule: "lib/intelligence",
      tags: ["intelligence", "knowledge"],
    });
  }

  return { nodes };
}

export function adaptAllKnowledgeNodes(venture: VentureProject): KnowledgeNode[] {
  const slices = [
    adaptDiscoveryNodes(venture),
    adaptResearchNodes(venture),
    adaptProductNodes(venture),
    adaptArchitectureNodes(venture),
    adaptUxNodes(venture),
    adaptBrandNodes(venture),
    adaptBuildNodes(venture),
    adaptDeploymentNodes(venture),
    adaptMemoryNodes(venture),
    adaptDecisionNodes(venture),
    adaptKnowledgeCatalogNodes(venture),
  ];

  const updatedAt = venture.updatedAt ?? new Date().toISOString();
  return slices.flatMap((s) =>
    s.nodes.map((n) => ({
      ...n,
      updatedAt,
    }))
  );
}
