/** Score each pending decision's impact on exit path. */

import type { Mission, PendingDecision } from "../types";
import type { DecisionImpact, DecisionImpactLevel, ExitStrategyType } from "./types";

const IMPACT_RULES: Record<
  ExitStrategyType,
  Array<{ category: string; optionPattern: RegExp; impact: DecisionImpactLevel; explanation: string }>
> = {
  venta: [
    { category: "PRICING", optionPattern: /suscripci[oó]n|recurring/i, impact: "positive", explanation: "Modelo recurrente mejora múltiplos de salida M&A." },
    { category: "PRICING", optionPattern: /freemium|gratis/i, impact: "neutral", explanation: "Freemium puede funcionar si conversión a paid es alta." },
    { category: "PRICING", optionPattern: /pago\s*[uú]nico/i, impact: "negative", explanation: "Ingresos one-time reducen valoración recurrente para compradores." },
    { category: "BRANDING", optionPattern: /corporativo|enterprise/i, impact: "positive", explanation: "Posicionamiento enterprise atrae adquirentes B2B." },
    { category: "ARCHITECTURE", optionPattern: /cloud|escalable/i, impact: "positive", explanation: "Arquitectura escalable facilita due diligence técnico." },
  ],
  crecimiento_independiente: [
    { category: "PRICING", optionPattern: /freemium/i, impact: "positive", explanation: "Freemium reduce CAC en bootstrap." },
    { category: "PRICING", optionPattern: /suscripci[oó]n/i, impact: "positive", explanation: "Recurrencia estabiliza ingresos sin capital externo." },
    { category: "PRICING", optionPattern: /pago\s*[uú]nico/i, impact: "neutral", explanation: "Pago único acelera cash pero limita LTV." },
    { category: "ARCHITECTURE", optionPattern: /simple|mvp/i, impact: "positive", explanation: "MVP lean reduce burn en crecimiento independiente." },
    { category: "DEPLOYMENT", optionPattern: /r[aá]pido|staging/i, impact: "positive", explanation: "Velocidad de deploy favorece iteración lean." },
  ],
  dividendos: [
    { category: "PRICING", optionPattern: /suscripci[oó]n/i, impact: "positive", explanation: "Recurrencia predecible sostiene dividendos." },
    { category: "PRICING", optionPattern: /freemium/i, impact: "negative", explanation: "Freemium diluye márgenes en modelo cash cow." },
    { category: "PRICING", optionPattern: /pago\s*[uú]nico/i, impact: "neutral", explanation: "Pago único puede funcionar con base estable." },
    { category: "BRANDING", optionPattern: /corporativo/i, impact: "positive", explanation: "Marca corporativa transmite estabilidad." },
    { category: "ARCHITECTURE", optionPattern: /enterprise|completo/i, impact: "negative", explanation: "Complejidad innecesaria eleva costes operativos." },
  ],
  venture_capital: [
    { category: "PRICING", optionPattern: /suscripci[oó]n/i, impact: "positive", explanation: "SaaS recurrente es el modelo preferido por VC." },
    { category: "PRICING", optionPattern: /freemium/i, impact: "positive", explanation: "Freemium acelera adquisición para growth metrics." },
    { category: "PRICING", optionPattern: /pago\s*[uú]nico/i, impact: "negative", explanation: "VC prefiere MRR/ARR sobre ingresos puntuales." },
    { category: "BRANDING", optionPattern: /audaz|bold/i, impact: "positive", explanation: "Brand audaz diferencia en narrativa de fundraising." },
    { category: "ARCHITECTURE", optionPattern: /cloud|escalable/i, impact: "positive", explanation: "Escalabilidad es requisito para growth capital." },
  ],
  patrimonio_familiar: [
    { category: "PRICING", optionPattern: /suscripci[oó]n/i, impact: "positive", explanation: "Ingresos recurrentes estabilizan patrimonio generacional." },
    { category: "PRICING", optionPattern: /pago\s*[uú]nico/i, impact: "neutral", explanation: "Modelo tradicional puede encajar en negocio familiar." },
    { category: "BRANDING", optionPattern: /corporativo/i, impact: "positive", explanation: "Marca sobria transmite continuidad generacional." },
    { category: "BRANDING", optionPattern: /audaz/i, impact: "neutral", explanation: "Brand audaz puede renovar legado si está bien gestionado." },
    { category: "ARCHITECTURE", optionPattern: /simple/i, impact: "positive", explanation: "Simplicidad facilita transferencia de conocimiento." },
  ],
};

function scoreDecision(decision: PendingDecision, strategy: ExitStrategyType): DecisionImpact {
  const rules = IMPACT_RULES[strategy];
  let impact: DecisionImpactLevel = "neutral";
  let explanation = "Impacto neutro en la estrategia de salida seleccionada.";

  for (const rule of rules) {
    if (decision.category === rule.category || rule.category === "*") {
      for (const opt of decision.options) {
        if (rule.optionPattern.test(opt)) {
          impact = rule.impact;
          explanation = rule.explanation;
          break;
        }
      }
    }
  }

  if (decision.important && impact === "negative") {
    explanation += " ⚠️ Decisión crítica con impacto negativo.";
  }

  return {
    decisionId: decision.id,
    decisionTitle: decision.title,
    impact,
    explanation,
    strategy,
  };
}

export function computeDecisionImpacts(mission: Mission, strategy: ExitStrategyType): DecisionImpact[] {
  const pending = mission.pendingDecisions.filter((d) => !d.resolved);
  return pending.map((d) => scoreDecision(d, strategy));
}

export function getDecisionImpactForId(
  mission: Mission,
  decisionId: string,
  strategy: ExitStrategyType
): DecisionImpact | undefined {
  return computeDecisionImpacts(mission, strategy).find((i) => i.decisionId === decisionId);
}

export function impactLabelEs(impact: DecisionImpactLevel): string {
  const map: Record<DecisionImpactLevel, string> = {
    positive: "Positivo",
    neutral: "Neutro",
    negative: "Negativo",
  };
  return map[impact];
}

export function impactVariant(impact: DecisionImpactLevel): "accent" | "default" | "red" {
  if (impact === "positive") return "accent";
  if (impact === "negative") return "red";
  return "default";
}
