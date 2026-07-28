import type { VentureProject } from "@/lib/domain/venture";
import { runVentureSimulator, ventureToSimulatorInput } from "@/lib/venture-simulator";
import type { VentureCeoBrief } from "./types";

function shortName(name: string): string {
  return name.length > 48 ? `${name.slice(0, 45)}…` : name;
}

export function buildVentureCeoBrief(venture: VentureProject): VentureCeoBrief {
  const name = shortName(venture.name);
  const discoveryAnswers = venture.discoveryContext?.answers.length ?? 0;
  const remaining = venture.discoveryContext?.remainingQuestions?.length ?? 0;

  let observation = `${name} avanza con estructura clara. El siguiente paso define el ritmo del venture.`;
  let recommendation = "Revisar el estado completo del workspace y cerrar la acción prioritaria.";
  let criticalRisk = "Dispersar foco entre demasiadas iniciativas reduce velocidad de validación.";
  let opportunity = "Un MVP acotado puede validar la propuesta con usuarios reales en pocas semanas.";

  if (remaining > 0) {
    observation = `Hay ${remaining} decisión${remaining > 1 ? "es" : ""} de Discovery pendiente${remaining > 1 ? "s" : ""} en ${name}.`;
    criticalRisk = "Respuestas incompletas distorsionan el análisis de mercado y el PRD.";
    recommendation = "Responder las preguntas de Discovery antes de avanzar a Research.";
    opportunity = "Cada respuesta mejora la precisión del Venture Score y del plan de producto.";
  } else if (discoveryAnswers < 2) {
    observation = `${name} necesita más contexto de Discovery para una valoración fiable.`;
    criticalRisk = "Sin Discovery, cualquier decisión de Build sería especulativa.";
    recommendation = "Completar al menos dos respuestas de Discovery.";
    opportunity = "Desbloquea Research con señales reales del fundador.";
  } else if (!venture.researchReport) {
    observation = `${name} tiene idea clara, pero Research sigue pendiente.`;
    criticalRisk = "Construir sin Research aumenta el riesgo de pivot costoso.";
    recommendation = "Completar Research de mercado y competencia.";
    opportunity = "Mejora la calidad del PRD y reduce incertidumbre antes del Build.";
  } else if (!venture.productPRD) {
    observation = `Research completado en ${name}. Falta contrato de producto.`;
    criticalRisk = "Sin PRD, el equipo no tiene claridad sobre qué construir.";
    recommendation = "Definir el PRD con alcance de MVP acotado.";
    opportunity = "Un PRD sólido acelera el Build Plan y reduce retrabajo.";
  } else if (venture.status === "building") {
    observation = `${name} está en fase de Construcción — el momentum es clave.`;
    criticalRisk = "Parar el Build sin revisar el workflow puede generar deuda técnica.";
    recommendation = "Continuar el workflow de Build sin interrupciones.";
    opportunity = "Cada entrega acerca el lanzamiento y la validación con usuarios.";
  } else if (venture.status === "ready") {
    observation = `${name} tiene paquete completo listo para revisión ejecutiva.`;
    recommendation = "Revisar Build Plan y preparar lanzamiento beta.";
    opportunity = "El venture está posicionado para captar tracción inicial.";
  }

  const sim =
    venture.ventureSimulatorResult ?? runVentureSimulator(ventureToSimulatorInput(venture));

  if (sim?.recommendation === "pivot") {
    criticalRisk = "El Venture Score sugiere que el wedge actual no es suficientemente diferenciado.";
    recommendation = "Reformular el segmento o la propuesta de valor antes del MVP.";
    opportunity = "Un pivot temprano evita semanas de Build con baja probabilidad de tracción.";
  } else if (sim?.recommendation === "research_more") {
    criticalRisk = "Faltan señales de competencia o mercado para decidir con confianza.";
    recommendation = "Profundizar Research antes de cerrar el PRD.";
    opportunity = "Más contexto de mercado mejora las probabilidades de product-market fit.";
  }

  if (venture.founderAdvisor?.opportunities?.length) {
    const top = venture.founderAdvisor.opportunities[0];
    if (top?.title) {
      opportunity = top.title + (top.description ? ` — ${top.description}` : "");
    }
  }

  return { observation, recommendation, criticalRisk, opportunity };
}
