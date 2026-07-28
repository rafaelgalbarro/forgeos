import type { JourneyPhaseDefinition } from "./types";

/** 15 official Founder Journey phases — exact order per Epic 7.1 */
export const FOUNDER_JOURNEY_PHASES: JourneyPhaseDefinition[] = [
  {
    id: "idea",
    label: "Idea",
    order: 1,
    objetivo: "Capturar y articular la oportunidad en una frase clara que guíe todo el recorrido.",
    estimatedTime: "15 min",
    valueTemplate: "Idea articulada y nombre de proyecto",
  },
  {
    id: "discovery",
    label: "Discovery",
    order: 2,
    objetivo: "Responder preguntas clave para que ForgeOS entienda contexto, usuario y restricciones.",
    estimatedTime: "30 min",
    valueTemplate: "Mapa de incógnitas y contexto fundador",
  },
  {
    id: "validacion",
    label: "Validación",
    order: 3,
    objetivo: "Validar la oportunidad con análisis inicial de mercado, riesgo y encaje estratégico.",
    estimatedTime: "20 min",
    valueTemplate: "Informe de inteligencia y score inicial",
  },
  {
    id: "research",
    label: "Research",
    order: 4,
    objetivo: "Profundizar en mercado, tendencias y evidencia para reducir incertidumbre.",
    estimatedTime: "45 min",
    valueTemplate: "Research report y referencias de mercado",
  },
  {
    id: "competidores",
    label: "Competidores",
    order: 5,
    objetivo: "Mapear competencia directa e indirecta y definir diferenciación defendible.",
    estimatedTime: "30 min",
    valueTemplate: "Landscape competitivo y posicionamiento",
  },
  {
    id: "ceo-review",
    label: "CEO Review",
    order: 6,
    objetivo: "Hito ejecutivo: el CEO AI consolida hallazgos y prioriza el siguiente paso estratégico.",
    estimatedTime: "10 min",
    valueTemplate: "Revisión ejecutiva y alineación estratégica",
    executive: true,
  },
  {
    id: "board-decision",
    label: "Board Decision",
    order: 7,
    objetivo: "Hito de gobernanza: el board evalúa viabilidad y emite recomendación de build.",
    estimatedTime: "15 min",
    valueTemplate: "Decisión de board y recomendación formal",
    executive: true,
  },
  {
    id: "product",
    label: "Product",
    order: 8,
    objetivo: "Definir propuesta de valor, alcance MVP y requisitos de producto.",
    estimatedTime: "60 min",
    valueTemplate: "PRD y definición de MVP",
  },
  {
    id: "architecture",
    label: "Architecture",
    order: 9,
    objetivo: "Diseñar arquitectura técnica alineada con escalabilidad y time-to-market.",
    estimatedTime: "45 min",
    valueTemplate: "Blueprint técnico y decisiones de stack",
  },
  {
    id: "ux",
    label: "UX",
    order: 10,
    objetivo: "Traducir el producto en flujos, wireframes y experiencia de usuario coherente.",
    estimatedTime: "40 min",
    valueTemplate: "Flujos UX y wireframes",
  },
  {
    id: "build",
    label: "Build",
    order: 11,
    objetivo: "Construir el MVP con frontend, backend y componentes esenciales.",
    estimatedTime: "2–5 días",
    valueTemplate: "Código base y artefactos de build",
  },
  {
    id: "qa",
    label: "QA",
    order: 12,
    objetivo: "Verificar calidad, accesibilidad y criterios de aceptación antes del deploy.",
    estimatedTime: "4 h",
    valueTemplate: "Plan de pruebas y checklist de calidad",
  },
  {
    id: "deployment",
    label: "Deployment",
    order: 13,
    objetivo: "Preparar infraestructura, despliegue y entorno listo para usuarios.",
    estimatedTime: "2 h",
    valueTemplate: "Entorno desplegado y configuración lista",
  },
  {
    id: "launch",
    label: "Launch",
    order: 14,
    objetivo: "Lanzar al mercado con landing, mensaje y primeros usuarios.",
    estimatedTime: "1 día",
    valueTemplate: "Landing y lanzamiento beta",
  },
  {
    id: "growth",
    label: "Growth",
    order: 15,
    objetivo: "Medir tracción, iterar KPIs y escalar adquisición y retención.",
    estimatedTime: "Continuo",
    valueTemplate: "KPIs, roadmap de crecimiento y métricas",
  },
];

export function getPhaseDefinition(id: JourneyPhaseDefinition["id"]): JourneyPhaseDefinition {
  const phase = FOUNDER_JOURNEY_PHASES.find((p) => p.id === id);
  if (!phase) throw new Error(`Unknown journey phase: ${id}`);
  return phase;
}
