import type { KnowledgeEntryBase } from "@/lib/knowledge/types";
import { PROMPT_CATALOG } from "@/lib/knowledge/prompts";
import { formatBrainContextForPrompt } from "@/lib/brain";
import { formatDiscoveryContextForPrompt } from "@/lib/discovery/discovery-context";
import type { ResearchRequest } from "../types/research";

export const RESEARCH_JSON_SCHEMA = `{
  "marketSummary": "string",
  "targetSegments": ["string"],
  "competitors": [
    {
      "name": "string",
      "type": "string",
      "strengths": ["string"],
      "weaknesses": ["string"]
    }
  ],
  "marketRisks": ["string"],
  "opportunities": ["string"],
  "differentiationAngles": ["string"],
  "validationPlan": ["string"],
  "recommendedNextQuestions": ["string"]
}`;

function formatKnowledgeContext(entries: KnowledgeEntryBase[]): string {
  if (entries.length === 0) return "Sin entradas adicionales del Knowledge Engine.";
  return entries
    .map(
      (e) =>
        `- [${e.domain}] ${e.title}: ${e.description} (tags: ${e.tags.join(", ")})`
    )
    .join("\n");
}

export function buildResearchPrompt(
  input: ResearchRequest,
  knowledgeEntries: KnowledgeEntryBase[] = []
): { system: string; user: string } {
  const catalogPrompt = PROMPT_CATALOG.find((p) => p.id === "prompt-research");

  const system = `Eres el Research Worker de ForgeOS. Tu trabajo es investigar mercado y competencia para una idea de startup.

REGLAS OBLIGATORIAS:
- No inventes datos precisos no verificados (TAM exacto, market share, funding rounds específicos).
- Señala incertidumbre cuando no tengas evidencia ("hipótesis", "por validar", "estimación cualitativa").
- Trabaja con hipótesis razonables basadas en el contexto proporcionado.
- Prioriza insights accionables para un fundador que va a construir un MVP.
- Usa knowledgeRefs como contexto orientativo, NO como verdad absoluta.
- Usa Discovery Context como decisiones explícitas del usuario. Tiene más prioridad que las heurísticas.
- Brain Context define cómo debe razonar ForgeOS. No sustituye datos del usuario ni Discovery Context.
- Responde ÚNICAMENTE con JSON válido en español, sin markdown ni texto adicional.
- El JSON debe seguir exactamente este esquema:
${RESEARCH_JSON_SCHEMA}

${catalogPrompt ? `Plantilla base del catálogo:\n${catalogPrompt.template}` : ""}

---
${formatBrainContextForPrompt("research")}`;

  const user = `Proyecto: ${input.projectName}
Tipo de aplicación: ${input.appType ?? "No especificado"}
Cliente objetivo: ${input.targetCustomer ?? "No especificado"}

Idea:
${input.ideaText}

Referencias del Knowledge Engine (contexto, no verdad absoluta):
${formatKnowledgeContext(knowledgeEntries)}

Referencias resumidas enviadas por el orchestrator:
${(input.knowledgeRefs ?? []).map((r) => `- ${r.title} (${r.domain})`).join("\n") || "Ninguna"}

---
DISCOVERY CONTEXT (decisiones del usuario — prioridad sobre heurísticas):
${formatDiscoveryContextForPrompt(input.discoveryContext)}`;

  return { system, user };
}
