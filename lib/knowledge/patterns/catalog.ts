import { seedMeta, slugId } from "../seed-helpers";
import type { PatternEntry } from "./types";

function pattern(
  title: string,
  description: string,
  category: PatternEntry["category"],
  tags: string[],
  whenToUse: string[],
  antiPatterns: string[]
): PatternEntry {
  return {
    id: slugId("pattern", title),
    domain: "patterns",
    title,
    description,
    tags,
    ...seedMeta(["ceo", "founder", "product", "cto"]),
    category,
    whenToUse,
    antiPatterns,
  };
}

export const PATTERN_CATALOG: PatternEntry[] = [
  pattern("PLG SaaS", "Product-led growth con onboarding autoservicio.", "growth", ["saas", "b2b", "freemium"], ["Trial sin ventas", "Time-to-value corto"], ["Demos obligatorias en SMB"]),
  pattern("Marketplace wedge", "Dominar un nicho geográfico o vertical antes de escalar.", "product", ["marketplace", "b2c"], ["Densidad local", "Supply-first o demand-first"], ["Lanzar nacional día uno"]),
  pattern("B2B sales-assisted", "Ventas humanas para ACV alto con piloto pagado.", "growth", ["b2b", "saas", "crm"], ["ACV > €2k", "Implementación custom"], ["Self-serve en enterprise"]),
  pattern("Freemium conversion loop", "Límites de uso que empujan upgrade natural.", "growth", ["freemium", "b2c", "saas"], ["Uso recurrente", "Feature gate claro"], ["Paywall agresivo día 1"]),
  pattern("Modular monolith", "Monolito modular antes de microservicios.", "engineering", ["saas", "web", "api"], ["MVP < 6 meses", "Equipo pequeño"], ["Microservicios prematuros"]),
  pattern("AI copilot layer", "IA como capa sobre flujo existente, no producto aislad.", "product", ["ai", "saas", "dashboard"], ["Datos propios", "Workflow repetitivo"], ["Chat sin acciones"]),
  pattern("Vertical SaaS", "Especialización en un sector con workflows nativos.", "product", ["b2b", "saas", "erp", "crm"], ["Dolor sectorial claro", "Menos competencia"], ["Horizontal sin wedge"]),
  pattern("Subscription retention", "Métricas de activación D7/D30 y expansion revenue.", "ops", ["subscription", "saas", "b2c"], ["Churn medible", "Hábito semanal"], ["Solo adquisición"]),
];
