/** User selection + persistence per mission. */

import type { ExitStrategySelection, ExitStrategyType } from "./types";
import { EXIT_STRATEGY_STORAGE_PREFIX } from "./types";
import { getExitStrategyLabel } from "./exit-strategy-registry";

function storageKey(missionId: string): string {
  return `${EXIT_STRATEGY_STORAGE_PREFIX}${missionId}`;
}

export function readExitStrategySelection(missionId: string): ExitStrategySelection | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(missionId));
    if (!raw) return null;
    return JSON.parse(raw) as ExitStrategySelection;
  } catch {
    return null;
  }
}

export function writeExitStrategySelection(selection: ExitStrategySelection): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(selection.missionId), JSON.stringify(selection));
}

export function clearExitStrategySelection(missionId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(storageKey(missionId));
}

export interface SelectStrategyResult {
  selection: ExitStrategySelection;
  isChange: boolean;
  impactWarning?: string;
}

export function selectExitStrategy(
  missionId: string,
  strategy: ExitStrategyType
): SelectStrategyResult {
  const existing = readExitStrategySelection(missionId);
  const isChange = existing !== null && existing.strategy !== strategy;

  const selection: ExitStrategySelection = {
    missionId,
    strategy,
    selectedAt: new Date().toISOString(),
    previousStrategy: isChange ? existing!.strategy : existing?.previousStrategy,
    changeCount: (existing?.changeCount ?? 0) + (isChange ? 1 : 0),
  };

  writeExitStrategySelection(selection);

  let impactWarning: string | undefined;
  if (isChange && existing) {
    impactWarning =
      `Cambiar de "${getExitStrategyLabel(existing.strategy)}" a "${getExitStrategyLabel(strategy)}" ` +
      "ajustará Roadmap, Finanzas, Marketing y Producto. Revisa el panel de alineación estratégica.";
  }

  return { selection, isChange, impactWarning };
}

/** Detect exit strategy type from user text. Returns null if ambiguous. */
export function detectExitStrategyFromText(input: string): ExitStrategyType | null | "ambiguous" {
  const text = input.toLowerCase().trim();
  if (!text) return null;

  const matches: ExitStrategyType[] = [];

  if (/\b(venta|vender|m\s*&\s*a|adquisici[oó]n|exit\s*sale|comprador)\b/i.test(text)) {
    matches.push("venta");
  }
  if (/\b(crecimiento\s*independiente|bootstrap|autofinanci|escalar\s*solo|sin\s*inversi[oó]n\s*externa)\b/i.test(text)) {
    matches.push("crecimiento_independiente");
  }
  if (/\b(dividendos|cash\s*cow|flujo\s*de\s*caja|distribuci[oó]n\s*beneficios)\b/i.test(text)) {
    matches.push("dividendos");
  }
  if (/\b(venture\s*capital|vc|inversi[oó]n|ronda|fundraising|levantar\s*capital)\b/i.test(text)) {
    matches.push("venture_capital");
  }
  if (/\b(patrimonio\s*familiar|legado|generacional|family\s*legacy|sucesi[oó]n)\b/i.test(text)) {
    matches.push("patrimonio_familiar");
  }

  if (/\b(estrategia\s*de\s*salida|exit\s*strategy|tipo\s*de\s*exit)\b/i.test(text) && matches.length === 0) {
    return "ambiguous";
  }

  if (matches.length === 1) return matches[0];
  if (matches.length > 1) return "ambiguous";
  return null;
}

export const EXIT_STRATEGY_CLARIFYING_QUESTION =
  "¿Cuál es tu estrategia de salida? Elige: Venta (M&A), Crecimiento independiente, Dividendos, Venture Capital o Patrimonio familiar.";

export function parseExitStrategyChoice(input: string): ExitStrategyType | null {
  const text = input.toLowerCase().trim();
  if (/^(1|venta|m\s*&\s*a|sale)/i.test(text)) return "venta";
  if (/^(2|crecimiento|independiente|bootstrap)/i.test(text)) return "crecimiento_independiente";
  if (/^(3|dividendos|cash\s*cow)/i.test(text)) return "dividendos";
  if (/^(4|venture|vc|capital)/i.test(text)) return "venture_capital";
  if (/^(5|patrimonio|familiar|legado)/i.test(text)) return "patrimonio_familiar";
  return detectExitStrategyFromText(input) === "ambiguous" ? null : (detectExitStrategyFromText(input) as ExitStrategyType | null);
}
