import type { KnowledgeEntryBase } from "@/lib/knowledge/types";
import { PROMPT_CATALOG } from "@/lib/knowledge/prompts";
import { formatBrainContextForPrompt } from "@/lib/brain";
import { formatDiscoveryContextForPrompt } from "@/lib/discovery/discovery-context";
import type { ProductPRDRequest } from "../types/product";
import type { ResearchReport } from "../types/research";

export const PRODUCT_PRD_JSON_SCHEMA = `{
  "executiveSummary": "string",
  "problemStatement": "string",
  "targetCustomer": "string",
  "valueProposition": "string",
  "mvpScope": ["string"],
  "v2Features": ["string"],
  "userStories": ["string"],
  "mainScreens": ["string"],
  "coreFlows": ["string"],
  "assumptions": ["string"],
  "risks": ["string"],
  "successMetrics": ["string"],
  "roadmap30_60_90": {
    "day30": ["string"],
    "day60": ["string"],
    "day90": ["string"]
  }
}`;

function formatResearchContext(research: ResearchReport | null | undefined): string {
  if (!research) return "No hay ResearchReport disponible. Basa el PRD en la idea y knowledgeRefs.";

  return `## Resumen de mercado
${research.marketSummary}

## Segmentos
${research.targetSegments.map((s) => `- ${s}`).join("\n")}

## Competidores
${research.competitors.map((c) => `- ${c.name} (${c.type}): fortalezas ${c.strengths.join(", ")}; debilidades ${c.weaknesses.join(", ")}`).join("\n")}

## Oportunidades
${research.opportunities.map((o) => `- ${o}`).join("\n")}

## Diferenciación
${research.differentiationAngles.map((d) => `- ${d}`).join("\n")}

## Plan de validación
${research.validationPlan.map((v, i) => `${i + 1}. ${v}`).join("\n")}

## Preguntas abiertas
${research.recommendedNextQuestions.map((q) => `- ${q}`).join("\n")}

## Riesgos de mercado
${research.marketRisks.map((r) => `- ${r}`).join("\n")}`;
}

function formatKnowledgeContext(entries: KnowledgeEntryBase[]): string {
  if (entries.length === 0) return "Sin entradas adicionales del Knowledge Engine.";
  return entries
    .map((e) => `- [${e.domain}] ${e.title}: ${e.description}`)
    .join("\n");
}

export function buildProductPrompt(
  input: ProductPRDRequest,
  knowledgeEntries: KnowledgeEntryBase[] = []
): { system: string; user: string } {
  const catalogPrompt = PROMPT_CATALOG.find((p) => p.id === "prompt-product");

  const system = `Eres el Product Worker de ForgeOS. Transformas investigación de mercado en un PRD accionable en español.

REGLAS OBLIGATORIAS:
- Usa el ResearchReport como contexto PRINCIPAL cuando esté disponible.
- Usa Discovery Context como decisiones explícitas del usuario. Tiene más prioridad que las heurísticas.
- Brain Context define cómo debe razonar ForgeOS. No sustituye datos del usuario ni Discovery Context.
- No inventes datos precisos no verificados (TAM exacto, market share, cifras de revenue).
- Transforma la investigación en decisiones de producto concretas y priorizadas.
- Prioriza un MVP pequeño y validable (4-8 semanas, máximo 5-7 items en mvpScope).
- Incluye hipótesis explícitas en assumptions y métricas medibles en successMetrics.
- Mantén incertidumbre cuando corresponda ("hipótesis", "por validar").
- knowledgeRefs son orientativos, no verdad absoluta.
- Responde ÚNICAMENTE con JSON válido, sin markdown ni texto adicional.
- El JSON debe seguir exactamente este esquema:
${PRODUCT_PRD_JSON_SCHEMA}

${catalogPrompt ? `Plantilla base del catálogo:\n${catalogPrompt.template}` : ""}

---
${formatBrainContextForPrompt("product")}`;

  const user = `Proyecto: ${input.projectName}
Tipo de aplicación: ${input.appType}
Cliente objetivo: ${input.targetCustomer}

Idea:
${input.description}

---
RESEARCH REPORT (contexto principal):
${formatResearchContext(input.researchReport)}

---
Knowledge Engine (contexto complementario):
${formatKnowledgeContext(knowledgeEntries)}

Referencias resumidas:
${(input.knowledgeRefs ?? []).map((r) => `- ${r.title} (${r.domain})`).join("\n") || "Ninguna"}

---
DISCOVERY CONTEXT (decisiones del usuario — prioridad sobre heurísticas):
${formatDiscoveryContextForPrompt(input.discoveryContext)}`;

  return { system, user };
}
