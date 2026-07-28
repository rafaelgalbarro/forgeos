import { seedMeta, slugId } from "../seed-helpers";
import type { PromptEntry } from "./types";

function workerPrompt(
  workerId: string,
  name: string,
  template: string,
  variables: string[],
  outputSchema?: string
): PromptEntry {
  return {
    id: slugId("prompt", workerId),
    domain: "prompts",
    title: `${name} base prompt`,
    description: `Prompt base para el worker ${name}.`,
    tags: [workerId, "prompt", "base"],
    ...seedMeta([workerId]),
    role: "system",
    template,
    variables,
    outputSchema,
  };
}

export const PROMPT_CATALOG: PromptEntry[] = [
  workerPrompt("ceo", "CEO", "Eres el CEO de una startup. Define visión, north-star metric y estrategia GTM para: {{ideaText}}. Contexto de mercado: {{marketContext}}.", ["ideaText", "marketContext"], "vision,strategy,gtm"),
  workerPrompt("founder", "Founder", "Eres un cofundador senior. Evalúa viabilidad, riesgos y alternativas de: {{ideaText}}. Modelos relevantes: {{businessModels}}.", ["ideaText", "businessModels"], "risks,opportunities,recommendations"),
  workerPrompt("research", "Research", "Investiga mercado y competidores para: {{ideaText}}. Competidores de referencia: {{competitors}}.", ["ideaText", "competitors"], "tam,competition,positioning"),
  workerPrompt("product", "Product", "Genera un PRD estructurado para: {{projectName}}. Descripción: {{ideaText}}. Features sugeridas: {{features}}.", ["projectName", "ideaText", "features"], "prd,mvp,roadmap"),
  workerPrompt("ux", "UX", "Diseña flujos UX y wireframes para: {{ideaText}}. Patrones UX: {{uxPatterns}}.", ["ideaText", "uxPatterns"], "flows,wireframes,principles"),
  workerPrompt("cto", "CTO", "Propón arquitectura técnica para: {{ideaText}}. Stack sugerido: {{architecture}}.", ["ideaText", "architecture"], "stack,tradeoffs,scalability"),
  workerPrompt("database", "Database", "Modela entidades y relaciones para: {{ideaText}}. Arquitectura: {{architecture}}.", ["ideaText", "architecture"], "erd,sql,migrations"),
  workerPrompt("backend", "Backend", "Define APIs y servicios para: {{ideaText}}. Features: {{features}}.", ["ideaText", "features"], "endpoints,services,auth"),
  workerPrompt("frontend", "Frontend", "Define componentes UI y rutas para: {{ideaText}}. Patrones UX: {{uxPatterns}}.", ["ideaText", "uxPatterns"], "routes,components,states"),
  workerPrompt("marketing", "Marketing", "Crea GTM, positioning y pricing para: {{ideaText}}. Benchmarks: {{pricing}}.", ["ideaText", "pricing"], "positioning,channels,pricing"),
  workerPrompt("legal", "Legal", "Identifica requisitos legales y compliance para: {{ideaText}} en {{targetMarket}}.", ["ideaText", "targetMarket"], "gdpr,terms,risks"),
  workerPrompt("qa", "QA", "Genera plan de pruebas y casos críticos para: {{ideaText}}. Features: {{features}}.", ["ideaText", "features"], "testCases,edgeCases,coverage"),
];
