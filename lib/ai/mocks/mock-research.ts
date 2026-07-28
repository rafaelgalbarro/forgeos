import type { CompetitorEntry } from "@/lib/knowledge/competitors";
import type { KnowledgeEntryBase } from "@/lib/knowledge/types";
import type { KnowledgeRefSummary, ResearchReport, ResearchRequest } from "../types/research";

function competitorsFromKnowledge(
  entries: KnowledgeEntryBase[],
  refs: KnowledgeRefSummary[]
): ResearchReport["competitors"] {
  const competitorEntries = entries.filter((e) => e.domain === "competitors") as CompetitorEntry[];

  if (competitorEntries.length > 0) {
    return competitorEntries.slice(0, 5).map((e) => ({
      name: e.title,
      type: e.category,
      strengths: e.strengths,
      weaknesses: e.weaknesses,
    }));
  }

  if (refs.length > 0) {
    return refs.slice(0, 3).map((r) => ({
      name: r.title,
      type: r.domain,
      strengths: ["Referencia del Knowledge Engine (por validar)"],
      weaknesses: ["Datos no verificados en esta fase"],
    }));
  }

  return [
    {
      name: "Incumbente horizontal",
      type: "SaaS generalista",
      strengths: ["Distribución", "Marca"],
      weaknesses: ["Poca especialización vertical (hipótesis)"],
    },
  ];
}

export function buildMockResearchReport(
  input: ResearchRequest,
  knowledgeEntries: KnowledgeEntryBase[] = []
): ResearchReport {
  const refs = input.knowledgeRefs ?? [];
  const appLabel = input.appType ?? "SaaS";
  const customer = input.targetCustomer ?? "usuarios objetivo";

  return {
    marketSummary: `Hipótesis de mercado para **${input.projectName}** (${appLabel}): existe demanda entre ${customer} por resolver el problema descrito. El tamaño exacto del mercado requiere validación con entrevistas y datos primarios. Contexto basado en ${refs.length} referencias del Knowledge Engine y análisis heurístico previo.`,
    targetSegments: [
      customer,
      `Early adopters en ${appLabel}`,
      "Equipos pequeños con dolor operativo recurrente (hipótesis)",
    ],
    competitors: competitorsFromKnowledge(knowledgeEntries, refs),
    marketRisks: [
      "Competencia de incumbentes con mayor distribución",
      "Adopción lenta si el dolor no es frecuente",
      "CAC elevado sin wedge claro (por validar)",
    ],
    opportunities: [
      "Especialización vertical vs. soluciones horizontales",
      "Mejor UX en el job-to-be-done principal",
      "Modelo híbrido SaaS + servicios para ingresos tempranos",
    ],
    differentiationAngles: [
      `Enfoque laser en ${customer}`,
      "Time-to-value más corto que alternativas genéricas",
      "Integración nativa con el flujo de trabajo existente (hipótesis)",
    ],
    validationPlan: [
      "10 entrevistas con usuarios potenciales en 2 semanas",
      "Landing con waitlist y propuesta de valor A/B",
      "Prototipo clickable del flujo core",
      "Análisis de 5 competidores directos e indirectos",
    ],
    recommendedNextQuestions: [
      "¿Quién paga y cuánto estaría dispuesto a pagar?",
      "¿Cuál es la alternativa actual (Excel, WhatsApp, incumbente)?",
      "¿Qué métrica mejoraría el cliente en 30 días si el producto funciona?",
    ],
  };
}
