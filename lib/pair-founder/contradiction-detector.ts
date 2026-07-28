/** STEP 3 — Contradiction detection with heuristic test-case handlers. */

import type { Contradiction, MissionContext, VentureMemory } from "./types";
import { readExitStrategySelection } from "@/lib/mission-control/exit-strategy/exit-strategy-selector";
import { getExitStrategyConfig } from "@/lib/mission-control/exit-strategy/exit-strategy-registry";
import type { ExitStrategyType } from "@/lib/mission-control/exit-strategy/types";

const CONTRADICTION_PAIRS: [RegExp, RegExp, string, string, string][] = [
  [
    /gratis|free|sin coste|barato|precio bajo/i,
    /premium|pago|suscripción|caro|alta rentabilidad|margen alto/i,
    "Precio bajo vs alta rentabilidad",
    "Un precio bajo dificulta alcanzar márgenes altos sin volumen masivo.",
    "Revisar unit economics o ajustar expectativa de rentabilidad",
  ],
  [
    /mvp|rápido|simple|2 semanas|dos semanas|15 días/i,
    /enterprise|completo|robusto|complej/i,
    "Timeline corto vs app enterprise compleja",
    "Una app enterprise requiere meses de desarrollo, no semanas.",
    "Reducir scope a MVP o extender timeline",
  ],
  [
    /b2c|consumidor/i,
    /b2b|empresa|enterprise/i,
    "Segmento B2C vs B2B",
    "Cambiar segmento invalida ICP, pricing y GTM previos.",
    "Confirmar nuevo ICP y adaptar plan",
  ],
  [
    /no.*mobile|sin app/i,
    /app móvil|mobile/i,
    "Sin mobile vs con app móvil",
    "Añadir mobile incrementa scope y coste significativamente.",
    "Definir si mobile es MVP o fase 2",
  ],
  [
    /bootstrap|sin inversión/i,
    /inversión|funding|capital|ronda/i,
    "Bootstrap vs buscar inversión",
    "Buscar inversión implica dilución y métricas de crecimiento.",
    "Confirmar fuente de financiación",
  ],
];

function id(): string {
  return `contra-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
}

/** Test case A: Low price + high profitability */
function detectPricingProfitabilityConflict(corpus: string, newText: string): Contradiction | null {
  const lowPrice = /gratis|free|barato|precio bajo|€\s*[1-9]\b|\$\s*[1-9]\b/i;
  const highProfit = /alta rentabilidad|margen alto|muy rentable|50%.*margen|70%.*margen/i;
  const corpusMatch = lowPrice.test(corpus) || highProfit.test(corpus);
  const newLow = lowPrice.test(newText);
  const newHigh = highProfit.test(newText);
  if (corpusMatch && ((lowPrice.test(corpus) && newHigh) || (highProfit.test(corpus) && newLow))) {
    return {
      id: id(),
      severity: "high",
      priorStatement: "Precio bajo vs alta rentabilidad",
      newInput: newText.slice(0, 80),
      suggestion: "Detecté tensión entre precio bajo y expectativa de alta rentabilidad.",
      impact: "Unit economics inviables sin volumen masivo o upsell agresivo.",
      alternative: "Modelo freemium con tier premium, o ajustar expectativa de margen.",
      requiredDecision: "¿Confirmas precio bajo con margen alto, o ajustamos el modelo?",
    };
  }
  return null;
}

/** Test case B: 2-week launch + complex enterprise app */
function detectTimelineComplexityConflict(corpus: string, newText: string): Contradiction | null {
  const shortTimeline = /2 semanas|dos semanas|15 días|1 mes|4 semanas/i;
  const complex = /enterprise|complej|multi-tenant|sso|compliance|soc2|gdpr/i;
  const combined = `${corpus} ${newText}`;
  if (shortTimeline.test(combined) && complex.test(combined)) {
    return {
      id: id(),
      severity: "critical",
      priorStatement: "Timeline corto + app enterprise compleja",
      newInput: newText.slice(0, 80),
      suggestion: "Un lanzamiento en 2 semanas con app enterprise es poco realista.",
      impact: "Riesgo de deuda técnica, bugs en producción y burnout del equipo.",
      alternative: "MVP B2B simplificado en 2 semanas, o timeline de 3-6 meses para enterprise.",
      requiredDecision: "¿Reducimos scope o extendemos el timeline?",
    };
  }
  return null;
}

/** Test case C: Target customer change mid-mission */
function detectCustomerChangeConflict(memory: VentureMemory, newText: string): Contradiction | null {
  const priorB2B = memory.keyFacts.some((f) => /b2b|empresa|enterprise/i.test(f)) ||
    memory.priorDecisions.some((d) => /b2b|empresa/i.test(d));
  const priorB2C = memory.keyFacts.some((f) => /b2c|consumidor/i.test(f));
  const newB2B = /b2b|empresa|enterprise/i.test(newText);
  const newB2C = /b2c|consumidor|retail/i.test(newText);

  if ((priorB2B && newB2C) || (priorB2C && newB2B)) {
    return {
      id: id(),
      severity: "high",
      priorStatement: priorB2B ? "Cliente objetivo: B2B/Enterprise" : "Cliente objetivo: B2C",
      newInput: newText.slice(0, 80),
      suggestion: "Cambio de cliente objetivo detectado a mitad de misión.",
      impact: "ICP, pricing, GTM y arquitectura quedan desalineados.",
      alternative: "Adaptar plan: recalcular ICP, pricing y entregables afectados.",
      requiredDecision: "¿Confirmas el cambio de segmento? Adaptaré el plan sin regenerar todo.",
    };
  }
  return null;
}

/** Test case D: 70% budget cut */
function detectBudgetCutConflict(memory: VentureMemory, newText: string): Contradiction | null {
  const budgetCut = /recort(e|ar).*presupuesto|70%.*menos|reducir.*70%|presupuesto.*-\s*70|budget cut/i;
  if (!budgetCut.test(newText)) return null;

  return {
    id: id(),
    severity: "high",
    priorStatement: memory.ventureSummary || "Scope actual del plan",
    newInput: newText.slice(0, 80),
    suggestion: "Recorte de presupuesto del ~70% detectado.",
    impact: "Scope actual excede recursos disponibles — entregables en riesgo.",
    alternative: "Priorizar MVP mínimo, posponer mobile/GTM avanzado, reducir fases paralelas.",
    requiredDecision: "¿Qué entregables son imprescindibles vs posponibles?",
  };
}

/** Test case E: User rejects CEO recommendation */
export function detectRecommendationRejection(
  newText: string,
  lastRecommendation?: string
): Contradiction | null {
  const rejection = /no\s+(estoy\s+de\s+acuerdo|acepto|quiero)|rechazo|prefiero\s+otra|otra\s+opción|discrepo/i;
  if (!rejection.test(newText) || !lastRecommendation) return null;

  return {
    id: id(),
    severity: "medium",
    priorStatement: lastRecommendation.slice(0, 80),
    newInput: newText.slice(0, 80),
    suggestion: "Rechazaste mi recomendación anterior — mantendré coherencia con tu decisión.",
    impact: "Ajustaré prioridades sin contradecir tu elección.",
    alternative: "Propongo alternativa alineada con tu preferencia.",
    requiredDecision: "¿Qué dirección prefieres en su lugar?",
  };
}

export function detectContradictions(
  ctx: MissionContext,
  memory: VentureMemory,
  userInput?: string
): Contradiction[] {
  const contradictions: Contradiction[] = [];
  const corpus = [
    ...memory.priorDecisions,
    ...memory.keyFacts,
    ...memory.strategyNotes,
    ...ctx.recentMessages.filter((m) => m.role === "user").map((m) => m.content),
    ctx.idea ?? "",
    ctx.founderProfile?.presupuesto ?? "",
    ctx.founderProfile?.tipoEmpresaDeseada ?? "",
  ].join(" ");

  const newText = userInput ?? "";
  if (!newText.trim()) return contradictions;

  for (const [patA, patB, label, impact, alternative] of CONTRADICTION_PAIRS) {
    const priorMatch = patA.test(corpus) || patB.test(corpus);
    const newMatchA = patA.test(newText);
    const newMatchB = patB.test(newText);
    if (priorMatch && ((patA.test(corpus) && newMatchB) || (patB.test(corpus) && newMatchA))) {
      contradictions.push({
        id: id(),
        severity: "high",
        priorStatement: label,
        newInput: newText.slice(0, 80),
        suggestion: `Detecté tensión en "${label}". ¿Confirmas el cambio de dirección o mantenemos la decisión anterior?`,
        impact,
        alternative,
        requiredDecision: `¿Confirmas cambio en "${label}"?`,
      });
    }
  }

  for (const prior of memory.priorDecisions) {
    const [title, option] = prior.split(" → ");
    if (!title || !option) continue;
    const negated = new RegExp(`no\\s+${option.slice(0, 8)}|cambiar.*${title.slice(0, 8)}`, "i");
    if (negated.test(newText)) {
      contradictions.push({
        id: id(),
        severity: "medium",
        priorStatement: prior,
        newInput: newText.slice(0, 80),
        suggestion: `Antes elegiste "${prior}". ¿Quieres revertir esta decisión?`,
        requiredDecision: `¿Revertir "${title}"?`,
      });
    }
  }

  const testCases = [
    detectPricingProfitabilityConflict(corpus, newText),
    detectTimelineComplexityConflict(corpus, newText),
    detectCustomerChangeConflict(memory, newText),
    detectBudgetCutConflict(memory, newText),
  ];
  for (const tc of testCases) {
    if (tc && !contradictions.some((c) => c.priorStatement === tc.priorStatement)) {
      contradictions.push(tc);
    }
  }

  const lastRec = memory.strategyNotes[memory.strategyNotes.length - 1];
  const rejection = detectRecommendationRejection(newText, lastRec);
  if (rejection) contradictions.push(rejection);

  contradictions.push(...detectExitStrategyContradictions(ctx.missionId, newText));
  contradictions.push(...detectArchitectureOverEngineering(ctx, newText));
  contradictions.push(...detectExpensiveAcquisition(ctx, newText));
  contradictions.push(...detectIgnoredLegalRisk(ctx, newText));

  return contradictions;
}

function detectArchitectureOverEngineering(ctx: MissionContext, newText: string): Contradiction[] {
  const overEng = /microservicios|kubernetes|k8s|multi-region|event.?sourcing/i;
  const earlyPhase = ctx.phase === "UNDERSTAND" || ctx.phase === "PLAN";
  if (earlyPhase && overEng.test(newText)) {
    return [{
      id: id(),
      severity: "medium",
      priorStatement: `Fase ${ctx.phase} — validación temprana`,
      newInput: newText.slice(0, 80),
      suggestion: "Arquitectura compleja en fase temprana puede ser over-engineering.",
      impact: "Retrasa time-to-market y aumenta coste sin usuarios validados.",
      alternative: "Monolito modular primero; escalar arquitectura cuando haya tracción.",
      requiredDecision: "¿Confirmas arquitectura avanzada ahora o simplificamos?",
    }];
  }
  return [];
}

function detectExpensiveAcquisition(ctx: MissionContext, newText: string): Contradiction[] {
  const expensive = /paid ads|google ads|facebook ads|influencer|€\s*\d{4,}|\$\s*\d{4,}/i;
  const lowBudget = ctx.founderProfile?.presupuesto?.match(/^\d{1,3}$|bajo|limitado/i) ||
    /bootstrap|sin presupuesto/i.test(ctx.founderProfile?.estrategiaCrecimiento ?? "");
  if (lowBudget && expensive.test(newText)) {
    return [{
      id: id(),
      severity: "high",
      priorStatement: "Presupuesto limitado / bootstrap",
      newInput: newText.slice(0, 80),
      suggestion: "Adquisición de pago costosa con presupuesto limitado.",
      impact: "Agotará runway antes de validar product-market fit.",
      alternative: "Crecimiento orgánico, content marketing, partnerships.",
      requiredDecision: "¿Confirmas inversión en paid acquisition?",
    }];
  }
  return [];
}

function detectIgnoredLegalRisk(ctx: MissionContext, newText: string): Contradiction[] {
  const regulated = /salud|health|fintech|financ|legal|gdpr|hipaa|datos personales/i;
  const noLegal = /sin abogado|ignorar legal|luego vemos/i;
  if (regulated.test(`${ctx.idea ?? ""} ${newText}`) && noLegal.test(newText)) {
    return [{
      id: id(),
      severity: "critical",
      priorStatement: "Sector regulado detectado",
      newInput: newText.slice(0, 80),
      suggestion: "Sector regulado requiere revisión legal antes de lanzar.",
      impact: "Riesgo regulatorio, multas y bloqueo de operaciones.",
      alternative: "Consulta legal mínima viable antes de BUILD.",
      requiredDecision: "¿Incluimos revisión legal en el plan?",
    }];
  }
  return [];
}

const EXIT_CONFLICT_PATTERNS: Record<ExitStrategyType, RegExp[]> = {
  venta: [/bootstrap|sin\s*inversi[oó]n|dividendos\s*ahora/i],
  crecimiento_independiente: [/levantar\s*capital|venture\s*capital|ronda\s*serie/i],
  dividendos: [/crecimiento\s*agresivo|quemar\s*capital|escalar\s*r[aá]pido/i],
  venture_capital: [/bootstrap|sin\s*funding|cash\s*cow|dividendos/i],
  patrimonio_familiar: [/vender\s*pronto|exit\s*en\s*3\s*a[nñ]os|ipo/i],
};

function detectExitStrategyContradictions(missionId: string, newText: string): Contradiction[] {
  const selection = readExitStrategySelection(missionId);
  if (!selection || !newText.trim()) return [];

  const patterns = EXIT_CONFLICT_PATTERNS[selection.strategy] ?? [];
  const config = getExitStrategyConfig(selection.strategy);
  const results: Contradiction[] = [];

  for (const pat of patterns) {
    if (pat.test(newText)) {
      results.push({
        id: id(),
        severity: "high",
        priorStatement: `Estrategia de salida: ${config.labelEs}`,
        newInput: newText.slice(0, 80),
        suggestion: `Tu input contradice la estrategia "${config.labelEs}". ¿Confirmas el cambio o mantenemos el exit path?`,
        requiredDecision: "¿Cambiar estrategia de salida?",
      });
      break;
    }
  }

  return results;
}

export function reframeReplyForContradictions(reply: string, contradictions: Contradiction[]): string {
  if (!contradictions.length) return reply;
  const high = contradictions.filter((c) => c.severity === "high" || c.severity === "critical");
  if (!high.length) return reply;

  const note = high[0].suggestion;
  if (reply.includes(note.slice(0, 20))) return reply;
  const impact = high[0].impact ? `\nImpacto: ${high[0].impact}` : "";
  const alt = high[0].alternative ? `\nAlternativa: ${high[0].alternative}` : "";
  return `${note}${impact}${alt}\n\n${reply}`;
}

export function replyContradictsMemory(reply: string, memory: VentureMemory): Contradiction[] {
  const fakeCtx: MissionContext = {
    missionId: memory.missionId,
    title: "",
    intention: null,
    phase: "PLAN",
    pendingDecisions: [],
    recentMessages: [],
    snapshots: [],
  };
  return detectContradictions(fakeCtx, memory, reply);
}
