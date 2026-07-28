/** Classify user input / card selection — CEO voice clarifying question. */

import type { IntentionResult, IntentionType, MissionIntent } from "./types";

const KEYWORDS: Record<IntentionType, string[]> = {
  VENTURE: ["empresa", "venture", "startup", "negocio", "fundar", "emprendimiento", "saas", "mantenimiento", "empresas de"],
  WEBSITE: ["web", "sitio", "landing", "página", "website", "pagina"],
  APPLICATION: ["aplicación", "aplicacion", "app web", "plataforma", "dashboard", "saas app", "gestionar", "incidencias", "inventario", "facturación", "rutas", "técnicos"],
  MOBILE: ["móvil", "movil", "ios", "android", "react native", "expo", "app móvil"],
  DISCOVERY: ["descubrir", "oportunidad", "ideas", "explorar", "no sé", "no se", "inspírame", "inspirame"],
};

const CARD_MAP: Record<string, IntentionType> = {
  venture: "VENTURE",
  website: "WEBSITE",
  application: "APPLICATION",
  mobile: "MOBILE",
  discovery: "DISCOVERY",
};

/** PROGRAM 5150 — dual intention detection (VENTURE + APPLICATION) */
export function classifyMissionIntent(input: string): MissionIntent {
  const text = input.trim().toLowerCase();
  if (!text) {
    return {
      primary: "VENTURE",
      confidence: 0,
      clarifyingQuestion: "Cuéntame en una frase qué quieres construir — empresa, web, app o móvil.",
    };
  }

  const scores: Partial<Record<IntentionType, number>> = {};
  for (const [type, words] of Object.entries(KEYWORDS) as [IntentionType, string[]][]) {
    scores[type] = words.filter((w) => text.includes(w)).length;
  }

  const ranked = (Object.entries(scores) as [IntentionType, number][])
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1]);

  const ventureScore = scores.VENTURE ?? 0;
  const appScore = scores.APPLICATION ?? 0;
  const webScore = scores.WEBSITE ?? 0;
  const mobileScore = scores.MOBILE ?? 0;

  // Dual VENTURE + APPLICATION pattern (field service / SaaS platforms)
  if (ventureScore > 0 && appScore > 0) {
    return {
      primary: "VENTURE",
      secondary: ["APPLICATION"],
      confidence: Math.min(1, 0.7 + (ventureScore + appScore) * 0.1),
      extractedIdea: input.trim(),
      ceoRationale: {
        ventureFirst:
          "Primero estructuramos el venture — modelo de negocio, ICP y unit economics — porque sin empresa clara el producto no escala.",
        webApp:
          "La plataforma web es el núcleo operativo: gestión de técnicos, incidencias, rutas e inventario en un solo hub.",
        publicWebsite:
          webScore > 0
            ? "Un sitio público ayuda a captar clientes B2B; lo planificamos en PLAN pero no es bloqueante para el MVP."
            : "Sitio público recomendado para adquisición B2B, pero el MVP puede empezar solo con la app.",
        mobileTiming:
          mobileScore > 0 || /técnico|campo|ruta/i.test(text)
            ? "Técnicos de campo se benefician de móvil — lo evaluamos en BUILD; MVP puede ser PWA primero."
            : "Móvil nativo puede esperar a validar el flujo web con los primeros clientes.",
      },
    };
  }

  if (ranked.length === 0) {
    if (text.length < 12) {
      return {
        primary: "VENTURE",
        confidence: 0.2,
        clarifyingQuestion: "¿Buscas crear una empresa, un sitio web, una aplicación o una app móvil?",
        extractedIdea: input.trim(),
      };
    }
    return { primary: "VENTURE", confidence: 0.5, extractedIdea: input.trim() };
  }

  const [top, topScore] = ranked[0];
  const second = ranked[1];
  const secondary: IntentionType[] = second && second[1] > 0 ? [second[0]] : [];

  if (topScore > 0 && second && second[1] > 0 && topScore === second[1]) {
    return {
      primary: top,
      secondary,
      confidence: 0.4,
      clarifyingQuestion: "Veo varias opciones posibles. ¿Prefieres empresa, web, aplicación o móvil?",
      extractedIdea: input.trim(),
    };
  }

  return {
    primary: top,
    secondary: secondary.length ? secondary : undefined,
    confidence: Math.min(1, 0.5 + topScore * 0.2),
    extractedIdea: input.trim(),
    ceoRationale: buildCeoRationale(top, secondary, text),
  };
}

function buildCeoRationale(
  primary: IntentionType,
  secondary: IntentionType[],
  text: string
): MissionIntent["ceoRationale"] {
  if (primary !== "VENTURE") return undefined;
  return {
    ventureFirst: "Estructuramos primero el venture para alinear producto, GTM y finanzas.",
    webApp: secondary.includes("APPLICATION") || /plataforma|app/i.test(text)
      ? "La aplicación web es el producto core del venture."
      : undefined,
    publicWebsite: "Evaluamos sitio público en PLAN según canal de adquisición.",
    mobileTiming: /móvil|campo|técnico/i.test(text)
      ? "Móvil en fase 2 tras validar MVP web."
      : "Móvil opcional en v2.",
  };
}

export function formatCeoIntentionExplanation(intent: MissionIntent): string {
  const parts: string[] = [];
  const label = intent.secondary?.length
    ? `${intent.primary} + ${intent.secondary.join(" + ")}`
    : intent.primary;
  parts.push(`Clasifico tu misión como **${label}** (confianza ${Math.round(intent.confidence * 100)}%).`);

  if (intent.ceoRationale?.ventureFirst) parts.push(intent.ceoRationale.ventureFirst);
  if (intent.ceoRationale?.webApp) parts.push(intent.ceoRationale.webApp);
  if (intent.ceoRationale?.publicWebsite) parts.push(intent.ceoRationale.publicWebsite);
  if (intent.ceoRationale?.mobileTiming) parts.push(intent.ceoRationale.mobileTiming);

  if (intent.clarifyingQuestion) {
    parts.push(`Una pregunta: ${intent.clarifyingQuestion}`);
  }

  return parts.join("\n\n");
}

export function classifyFromCard(cardId: string, idea?: string): IntentionResult {
  const intention = CARD_MAP[cardId];
  if (!intention) {
    return { intention: null, confidence: 0, clarifyingQuestion: "¿Qué tipo de proyecto quieres crear?" };
  }
  return { intention, confidence: 1, extractedIdea: idea?.trim() || undefined };
}

export function classifyUserInput(input: string): IntentionResult {
  const intent = classifyMissionIntent(input);
  if (intent.confidence < 0.3 && intent.clarifyingQuestion) {
    return {
      intention: null,
      confidence: intent.confidence,
      clarifyingQuestion: intent.clarifyingQuestion,
      extractedIdea: intent.extractedIdea,
    };
  }
  return {
    intention: intent.primary,
    confidence: intent.confidence,
    clarifyingQuestion: intent.clarifyingQuestion,
    extractedIdea: intent.extractedIdea,
  };
}

export function ceoClarifyingVoice(question: string): string {
  return `Como CEO, necesito una decisión: ${question}`;
}
