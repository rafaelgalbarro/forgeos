import type {
  DiscoveryAnswer,
  DiscoveryAnswerMap,
  DiscoveryContext,
  DiscoveryQuestion,
  DiscoveryResult,
} from "./types";

function answerText(answer: string | string[]): string {
  return Array.isArray(answer) ? answer.join(" ") : answer;
}

function allAnswersText(answers: DiscoveryAnswer[]): string {
  return answers.map((a) => answerText(a.answer)).join(" ").toLowerCase();
}

function hasPattern(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

export function buildDiscoveryContext(
  ideaText: string,
  discoveryResult: DiscoveryResult | null,
  answerMap: DiscoveryAnswerMap
): DiscoveryContext | null {
  const answers = Object.values(answerMap).filter((a) => {
    const v = answerText(a.answer);
    return v.trim().length > 0;
  });

  if (answers.length === 0 && !discoveryResult) return null;

  const text = allAnswersText(answers);
  const base = discoveryResult?.classification;

  let inferredProductType = base?.productType ?? "Producto digital (por definir)";
  let inferredBusinessModel = base?.probableBusinessModel ?? "Por validar";
  const targetCustomerHints: string[] = [];
  const monetizationHints: string[] = [];
  const trustAndSafetyHints: string[] = [];
  const platformHints: string[] = [];
  const buildConstraints: string[] = [];
  const clarifiedDecisions: string[] = [];

  if (hasPattern(text, [/wallapop|vinted|ebay|c2c|generalista/i])) {
    inferredProductType = "Marketplace C2C";
    platformHints.push("Referencia C2C tipo Wallapop/Vinted/eBay");
    clarifiedDecisions.push("Modelo marketplace C2C confirmado por el usuario");
  }

  if (hasPattern(text, [/vertical|especializado|moda|electr[oó]nica|motor|hogar/i])) {
    inferredProductType = inferredProductType.includes("Marketplace")
      ? "Marketplace vertical"
      : "Producto vertical";
    platformHints.push("Enfoque vertical / nicho");
    clarifiedDecisions.push("Wedge vertical definido por el usuario");
  }

  if (hasPattern(text, [/generalista/i])) {
    platformHints.push("Catálogo generalista — mayor competencia");
    buildConstraints.push("Competir con incumbentes horizontales");
    clarifiedDecisions.push("Alcance generalista");
  }

  if (hasPattern(text, [/comisi[oó]n|take\s*rate/i])) {
    monetizationHints.push("Monetización por comisión");
    inferredBusinessModel = "Comisión por transacción";
    clarifiedDecisions.push("Monetización: comisión");
  }

  if (hasPattern(text, [/anuncios?\s+destacados|destacados|premium\s+listings/i])) {
    monetizationHints.push("Anuncios destacados / listings premium");
    clarifiedDecisions.push("Monetización: visibilidad premium");
  }

  if (hasPattern(text, [/suscripci[oó]n|subscription/i])) {
    monetizationHints.push("Suscripción recurrente");
    clarifiedDecisions.push("Monetización: suscripción");
  }

  if (hasPattern(text, [/publicidad|ads/i])) {
    monetizationHints.push("Publicidad");
  }

  if (hasPattern(text, [/solo\s+particulares|particulares/i])) {
    targetCustomerHints.push("Solo particulares en el lado oferta");
    clarifiedDecisions.push("Supply-side: particulares");
  }

  if (hasPattern(text, [/empresas|tiendas|b2b/i])) {
    targetCustomerHints.push("Empresas o tiendas en la plataforma");
    clarifiedDecisions.push("Supply-side: empresas");
  }

  if (hasPattern(text, [/pagos?\s+en\s+plataforma|escrow|dentro\s+de\s+la\s+plataforma/i])) {
    trustAndSafetyHints.push("Pagos integrados en plataforma");
    buildConstraints.push("Mayor complejidad: pagos, escrow y disputas");
    clarifiedDecisions.push("Pagos dentro de la plataforma");
  }

  if (hasPattern(text, [/sin\s+pagos|solo\s+anuncios|contacto|whatsapp/i])) {
    trustAndSafetyHints.push("Sin pagos integrados — contacto directo");
    buildConstraints.push("Menor complejidad técnica; mayor riesgo de desintermediación");
    clarifiedDecisions.push("Modelo contacto/anuncios sin transacción");
  }

  if (hasPattern(text, [/reputaci[oó]n|reviews|disputas/i])) {
    trustAndSafetyHints.push("Reputación y resolución de disputas");
  }

  for (const answer of answers) {
    clarifiedDecisions.push(`${answer.question} → ${answer.answerLabel ?? answerText(answer.answer)}`);
  }

  const answeredIds = new Set(answers.map((a) => a.questionId));
  const remainingQuestions =
    discoveryResult?.questions
      .filter((q) => !answeredIds.has(q.id))
      .map((q) => q.question) ?? [];

  return {
    clarifiedDecisions: [...new Set(clarifiedDecisions)],
    remainingQuestions,
    inferredProductType,
    inferredBusinessModel,
    targetCustomerHints: [...new Set(targetCustomerHints)],
    monetizationHints: [...new Set(monetizationHints)],
    trustAndSafetyHints: [...new Set(trustAndSafetyHints)],
    platformHints: [...new Set(platformHints)],
    buildConstraints: [...new Set(buildConstraints)],
    answers,
  };
}

export function formatDiscoveryContextForPrompt(context: DiscoveryContext | null | undefined): string {
  if (!context || context.answers.length === 0) {
    return "Sin Discovery Context — usar heurísticas.";
  }

  return `DECISIONES EXPLÍCITAS DEL USUARIO (prioridad sobre heurísticas):
- Tipo de producto inferido: ${context.inferredProductType}
- Modelo de negocio inferido: ${context.inferredBusinessModel}

Decisiones aclaradas:
${context.clarifiedDecisions.map((d) => `- ${d}`).join("\n")}

Monetización: ${context.monetizationHints.join(", ") || "—"}
Cliente objetivo: ${context.targetCustomerHints.join(", ") || "—"}
Confianza y pagos: ${context.trustAndSafetyHints.join(", ") || "—"}
Plataforma: ${context.platformHints.join(", ") || "—"}
Restricciones de build: ${context.buildConstraints.join(", ") || "—"}

Preguntas pendientes:
${context.remainingQuestions.map((q) => `- ${q}`).join("\n") || "—"}`;
}

export function getDiscoveryScoreAdjustment(context: DiscoveryContext | null | undefined): number {
  if (!context) return 0;

  let adjustment = 0;
  const text = allAnswersText(context.answers);

  if (context.answers.length >= 3) adjustment += 6;
  else if (context.answers.length >= 1) adjustment += 3;

  if (hasPattern(text, [/vertical|especializado|niche/i])) adjustment += 5;
  if (hasPattern(text, [/generalista/i])) adjustment -= 4;
  if (hasPattern(text, [/comisi[oó]n/i]) && hasPattern(text, [/vertical/i])) adjustment += 3;
  if (hasPattern(text, [/pagos?\s+en\s+plataforma|escrow/i])) adjustment -= 3;
  if (hasPattern(text, [/sin\s+pagos|solo\s+anuncios|contacto/i])) adjustment += 2;
  if (hasPattern(text, [/wallapop|vinted|c2c/i])) adjustment += 2;

  return Math.max(-8, Math.min(12, adjustment));
}

export function createDiscoveryAnswer(
  question: DiscoveryQuestion,
  answer: string | string[]
): DiscoveryAnswer {
  const label = Array.isArray(answer) ? answer.join(", ") : answer;
  return {
    questionId: question.id,
    question: question.question,
    answer,
    answerLabel: label,
    impacts: question.impacts,
    createdAt: new Date().toISOString(),
  };
}

export function countAnsweredQuestions(
  questions: DiscoveryQuestion[],
  answerMap: DiscoveryAnswerMap
): { answered: number; total: number } {
  const total = questions.length;
  const answered = questions.filter((q) => {
    const a = answerMap[q.id];
    if (!a) return false;
    const t = answerText(a.answer).trim();
    return t.length > 0;
  }).length;
  return { answered, total };
}
