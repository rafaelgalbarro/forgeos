import type { NextAction } from "./next-action";
import { resolvePortfolioNextAction } from "./next-action";

export interface SmartAction {
  label: string;
  href: string;
  impact: string;
  estimatedTime: string;
  rationale: string;
  ventureName?: string;
  priority: NextAction["priority"];
}

const TIME_BY_ACTION: Record<string, string> = {
  "Responder Discovery": "10–15 min",
  "Completar Research": "20–30 min",
  "Revisar Venture Simulator": "5–10 min",
  "Revisar PRD": "15–20 min",
  "Revisar Build Plan": "10–15 min",
  "Continuar Build": "30–60 min",
  "Profundizar Research": "20–30 min",
  "Revisar pivot sugerido": "15–25 min",
  "Lanzar Beta": "1–2 h",
  "Abrir venture workspace": "5 min",
};

const RATIONALE_BY_PRIORITY: Record<NextAction["priority"], string> = {
  alta: "Es el cuello de botella que desbloquea el resto del pipeline.",
  media: "Mantiene momentum sin dispersar foco del equipo.",
  baja: "Consolida avances ya logrados en el venture.",
};

export function getEstimatedTimeForAction(label: string): string {
  return TIME_BY_ACTION[label] ?? "15–20 min";
}

function defaultRationale(action: NextAction): string {
  if (action.description.includes("Discovery")) {
    return "Sin Discovery cerrado, Research y Product trabajan con contexto incompleto.";
  }
  if (action.label.includes("Research")) {
    return "Research reduce incertidumbre antes de invertir en Build.";
  }
  if (action.label.includes("Simulator")) {
    return "El simulador prioriza dónde poner capital de tiempo.";
  }
  return RATIONALE_BY_PRIORITY[action.priority];
}

export function buildSmartAction(action: NextAction): SmartAction {
  return {
    label: action.label,
    href: action.href,
    impact: action.impact,
    estimatedTime: getEstimatedTimeForAction(action.label),
    rationale: defaultRationale(action),
    ventureName: action.ventureName,
    priority: action.priority,
  };
}

export function buildPortfolioSmartAction(
  ventures: Parameters<typeof resolvePortfolioNextAction>[0]
): SmartAction | null {
  const next = resolvePortfolioNextAction(ventures);
  return next ? buildSmartAction(next) : null;
}
